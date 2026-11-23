import * as THREE from 'three';
import { LAND_Y } from '../config.js';

// Uniforms shared by every patched material; the mood system writes to these.
export const shared = {
  uGlow: { value: 0 },
  uTime: { value: 0 },
  uLandY: { value: LAND_Y },
  uWet: { value: 0 },
  uWind: { value: 0.55 },
  uSunDir: { value: new THREE.Vector3(0.7, 0.6, 0.3) },
  uSunI: { value: 2.5 },
  uLook: { value: 0 }, // 0 realistic (reflections, relief, rooms behind glass), 1 illustrated (flat washes; the ink is drawn in post.js)
};

// In the drawn look the ground (the slab, the hills and the streets, greens and yards laid on them, none of which
// write depth) writes this alpha, so the ink in post.js can tell it from built form: its 25 m triangles fold by
// 10-25 degrees on the hills, and seen through a street those folds drew as triangles. Leaves write 0, the rest 1.
// GLSL float literal; post.js reads it back as the band 0.9-0.965 (all four MSAA samples on ground).
export const GROUND_A = '0.96';

// Wind on instanced foliage, in object space after begin_vertex; shared by the leaves and by their shadow pass.
const WIND = /* glsl */ `
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
        #endif`;

// One sun, more than one shadow map: light 0 lights the scene and carries the wide map; a second shadow-casting
// directional light (zero intensity, see src/env/csm.js) is a tight map round the point of attention, used wherever
// it reaches and blended into the wide one at its edge.
const lfb = THREE.ShaderChunk.lights_fragment_begin;
const lfbA = lfb.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )'), lfbB = lfb.indexOf('#if ( NUM_RECT_AREA_LIGHTS > 0 )');
const hueShadowOf = (i) => `getShadow( directionalShadowMap[ ${i} ], directionalLightShadows[ ${i} ].shadowMapSize, directionalLightShadows[ ${i} ].shadowIntensity, directionalLightShadows[ ${i} ].shadowBias, directionalLightShadows[ ${i} ].shadowRadius, vDirectionalShadowCoord[ ${i} ] )`;
const LIGHTS = lfbA < 0 || lfbB < lfbA ? null : lfb.slice(0, lfbA) + /* glsl */ `
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
  getDirectionalLightInfo( directionalLights[ 0 ], directLight );
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  if ( receiveShadow ) {
    float hueSh = 0.0, hueRest = 1.0;
    #if NUM_DIR_LIGHT_SHADOWS > 1
    {
      vec3 sc = vDirectionalShadowCoord[ 1 ].xyz / vDirectionalShadowCoord[ 1 ].w;
      vec2 se = abs( sc.xy - 0.5 ) * 2.0;
      float sw = ( 1.0 - smoothstep( 0.8, 0.96, max( se.x, se.y ) ) ) * step( sc.z, 1.0 ) * step( 0.0, sc.z );
      if ( sw > 0.0 ) { hueSh += sw * ${hueShadowOf(1)}; hueRest -= sw; }
    }
    #endif
    if ( hueRest > 0.0 ) hueSh += hueRest * ${hueShadowOf(0)};
    #ifdef HUE_FOLIAGE
    hueSh = mix( 1.0, hueSh, 0.5 ); // leaves pass light on: the shade inside a crown is never full
    #endif
    directLight.color *= hueSh;
  }
  #endif
  RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
` + lfb.slice(lfbB);
if (!LIGHTS) console.warn('[hue] three.js light loop changed; shadow cascades are off');
// the cascade loop calls getShadow itself: if its parameters change, keep three's own loop rather than fail to compile
const SHADOW_SIG = THREE.ShaderChunk.shadowmap_pars_fragment.includes('vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord )');
if (LIGHTS && !SHADOW_SIG) console.warn('[hue] three.js getShadow() signature changed; shadow cascades are off');
const cascades = (sh) => { if (LIGHTS && SHADOW_SIG) sh.fragmentShader = patch(sh.fragmentShader).replace('#include <lights_fragment_begin>', LIGHTS).src; };

// Shader patching that fails loudly: every chunk a patch hooks onto must be in the source. If a three.js upgrade
// renames one, warn once naming it (as the light-loop guard above does) rather than lose wind or
// tinting without a word. Use as patch(src).replace(tag, code)….src
const missing = new Set();
export const patch = (src) => ({
  src,
  replace(tag, code) {
    if (this.src.includes(tag)) this.src = this.src.replace(tag, code);
    else if (!missing.has(tag)) { missing.add(tag); console.warn(`[hue] three.js shader has no ${tag}; the patch hooked there is off`); }
    return this;
  },
});

const COMMON = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
varying float vKind;
varying float vBase;
varying float vFlood;
uniform float uGlow;
uniform float uLandY;
uniform float uWet;
uniform vec3 uSunDir;
uniform float uSunI;
uniform float uLook;
float hueHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float hueNoiseRaw( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hueHash( i ), hueHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hueHash( i + vec2( 0.0, 1.0 ) ), hueHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}
// the drawn look lays flat washes: weathering and mottling settle most of the way to their middle tone
float hueNoise( vec2 p ) { return mix( hueNoiseRaw( p ), 0.5, uLook * 0.78 ); }
// The room behind a pane (interior mapping): p is the place in the bay (0..1 across and up), d the sight line as
// (along the wall, up, into the wall), size the bay in metres. The ray is run to the back wall, a side wall, the floor
// or the ceiling of a box as wide and tall as the bay, so the room shifts behind the glass as the camera moves.
vec3 hueRoom( vec2 p, vec3 d, vec2 size, float depth, float seed ) {
  vec3 dd = vec3( d.x / size.x, d.y / size.y, max( d.z, 0.02 ) / depth );
  dd.x = abs( dd.x ) < 1e-4 ? 1e-4 : dd.x; dd.y = abs( dd.y ) < 1e-4 ? 1e-4 : dd.y;
  vec3 t3 = vec3( ( step( 0.0, dd.x ) - p.x ) / dd.x, ( step( 0.0, dd.y ) - p.y ) / dd.y, 1.0 / dd.z );
  float t = min( t3.x, min( t3.y, t3.z ) );
  vec3 h = vec3( p, 0.0 ) + dd * t;
  vec3 wall = seed < 0.4 ? vec3( 0.66, 0.6, 0.48 ) : seed < 0.75 ? vec3( 0.56, 0.62, 0.6 ) : vec3( 0.7, 0.62, 0.56 );
  vec3 c;
  if ( t == t3.z ) {
    // back wall: a door or a cabinet, and a picture
    c = wall * 0.82;
    float door = step( abs( h.x - 0.3 - 0.4 * fract( seed * 7.3 ) ), 0.13 ) * step( h.y, 0.62 );
    c = mix( c, vec3( 0.24, 0.16, 0.11 ), door * 0.85 );
    c = mix( c, vec3( 0.75, 0.7, 0.6 ), step( abs( h.x - 0.72 + 0.4 * fract( seed * 3.1 ) ), 0.07 ) * step( abs( h.y - 0.66 ), 0.07 ) * ( 1.0 - door ) );
  } else if ( t == t3.y ) c = dd.y > 0.0 ? vec3( 0.86, 0.84, 0.78 ) : vec3( 0.34, 0.25, 0.18 ) * ( 0.85 + 0.3 * step( 0.5, fract( h.x * 7.0 ) ) );
  else c = wall * 0.62;
  return c * mix( 1.0, 0.42, clamp( h.z, 0.0, 1.0 ) );
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
float hueH = vWPos.y - uLandY - vBase; // height above this building's own floor level
float hueWall = 1.0 - smoothstep( 0.25, 0.6, abs( hueN.y ) );
float hueLit = 0.0;      // window light mask, used by the emissive term
float hueGlass = 0.0;    // exposed glass, for sun glints
float hueGlaze = 0.0;    // glazed tile, for sheen
vec3 hueRib = hueN;      // tile-ribbed normal
vec2 hueCell = vec2( 0.0 );
float hueRough = 0.86;   // per-kind roughness and metalness, handed to the PBR lighting
float hueMetal = 0.0;
float hueHgt = 0.0;      // relief in metres (joints, reveals); turned into a normal at the end
vec3 hueNp = hueN;       // the normal after relief
vec3 hueRoomC = vec3( 1.0 ); // the room seen through a lit window

#ifdef HUE_FOLIAGE
  // the leaf cards (aKind 2, see PART in foliage.js) carry the atlas, a grey pattern whose mean is about 0.45 (linear):
  // bring it back to 1, so a crown shows its own colour rather than a third of it
  if ( vKind > 1.5 ) diffuseColor.rgb *= 2.2;
  // leaf clumps: two scales of mottling, cooler in the hollows
  float leafA = hueNoise( vWPos.xz * 1.9 + vWPos.y * 1.3 );
  float leafB = hueNoise( vWPos.xz * 6.0 - vWPos.y * 4.0 );
  float leafC = hueNoise( vWPos.xz * 13.0 + vWPos.y * 9.0 );
  float leaf = leafA * 0.5 + leafB * 0.3 + leafC * 0.2;
  diffuseColor.rgb *= 0.6 + 0.78 * leaf;
  // sunlit clumps go warmer and yellower, hollows cooler
  diffuseColor.rgb = mix( diffuseColor.rgb * vec3( 0.8, 0.94, 1.1 ), diffuseColor.rgb * vec3( 1.1, 1.06, 0.78 ), smoothstep( 0.35, 0.75, leaf ) );
  // drawn: one clear wash per crown
  if ( uLook > 0.5 ) diffuseColor.rgb = mix( diffuseColor.rgb, vColor.rgb * vColor.rgb * 1.5, 0.75 );
  // a crown is pigment, not a lamp: past 0.6 the brightest channel is eased toward 0.85 with the hue kept, or the
  // light blossom (hoàng mai, bằng lăng, phượng) and the sunlit leaf tips go out to white in the sun
  {
    float hueTop = max( diffuseColor.r, max( diffuseColor.g, diffuseColor.b ) );
    if ( hueTop > 0.6 ) diffuseColor.rgb *= ( 0.6 + 0.25 * ( 1.0 - exp( ( 0.6 - hueTop ) / 0.25 ) ) ) / hueTop;
  }
  hueRough = 0.8;
#else

if ( ( vKind > 0.5 && vKind < 1.5 ) || ( vKind > 7.5 && vKind < 8.5 ) || ( vKind > 9.5 && vKind < 11.5 ) ) {
  // ---------------- facade (kind 8: institutions — the same bays on every floor, no shopfronts) ----------------
  // kind 10: Indochine — arched openings, louvred shutters, white trim. kind 11: modern — ribbon glazing, balconies
  bool colonial = vKind > 9.5 && vKind < 10.5;
  bool modern = vKind > 10.5;
  bool civic = vKind > 7.5 && vKind < 8.5;
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
  // after dark: whole neighbourhoods are awake or asleep, each facade has its own share of lit rooms,
  // and every lit window its own strength — never a wall of identical bright panes
  float hood = smoothstep( 0.25, 0.8, hueNoise( vWPos.xz * 0.013 ) );
  float litP = mix( 0.05, 0.3, hood ) * ( 0.55 + 0.9 * hueHash( vec2( side, 3.0 ) ) );
  float litK = 0.4 + 0.6 * hueHash( cell + 4.7 );
  vec3 base = diffuseColor.rgb;
  // plaster: soft blotches and rain streaks running down from the eaves
  float streak = hueNoise( vec2( uv.x * 9.0, uv.y * 0.7 ) );
  base *= 0.93 + 0.1 * hueNoise( uv * vec2( 1.7, 2.3 ) ) - 0.09 * streak * smoothstep( 0.2, 1.0, f.y );
  vec3 col = base;
  if ( colonial ) {
    vec2 q = vec2( ( f.x - 0.5 ) * 2.9, ( f.y - 0.6 ) * 3.4 );
    float hw = 0.5, hs = hw + 0.15;
    float win = max( step( abs( q.x ), hw ) * step( 0.13, f.y ) * step( f.y, 0.6 ), step( length( q ), hw ) * step( 0.6, f.y ) );
    float sur = max( step( abs( q.x ), hs ) * step( 0.1, f.y ) * step( f.y, 0.6 ), step( length( q ), hs ) * step( 0.6, f.y ) );
    float upper = step( 0.5, cell.y );
    float shutter = step( hs, abs( q.x ) ) * step( abs( q.x ), hs + 0.4 ) * step( 0.13, f.y ) * step( f.y, 0.62 ) * upper;
    vec3 trim = vec3( 0.95, 0.92, 0.84 );
    vec3 louvre = ( bay < 0.72 ? vec3( 0.15, 0.33, 0.26 ) : vec3( 0.2, 0.31, 0.4 ) ) * ( 0.76 + 0.24 * step( 0.5, fract( f.y * 26.0 ) ) );
    vec3 glass = mix( vec3( 0.05, 0.06, 0.08 ), vec3( 0.2, 0.27, 0.33 ), smoothstep( 0.15, 0.7, f.y ) );
    glass *= 1.0 - 0.55 * ( 1.0 - smoothstep( 0.0, 0.035, abs( q.x ) ) );
    glass *= 1.0 - 0.45 * smoothstep( 0.52, 0.72, f.y );
    // at street level the arches open onto a shaded arcade
    glass = mix( mix( vec3( 0.06, 0.05, 0.05 ), vec3( 0.16, 0.12, 0.09 ), smoothstep( 0.0, 0.6, f.y ) ), glass, upper );
    col = mix( col, trim, sur * 0.94 );
    col = mix( col, louvre, shutter );
    col = mix( col, glass, win );
    // string course at every floor, a pilaster every third bay, a darker plinth
    col = mix( col, trim, 1.0 - smoothstep( 0.05, 0.07, f.y ) );
    col = mix( col, trim * 0.97, step( mod( cell.x, 3.0 ), 0.5 ) * ( 1.0 - smoothstep( 0.06, 0.08, f.x ) ) );
    col = mix( col, base * 0.7, ( 1.0 - upper ) * ( 1.0 - win ) * ( 1.0 - smoothstep( 0.1, 0.12, f.y ) ) * step( 0.07, f.y ) );
    hueGlass = win * upper * detail;
    hueLit = win * step( seed, mix( litP * 1.4, litP, upper ) ) * litK;
  } else if ( modern ) {
    if ( cell.y < 0.5 ) {
      // a glazed front under a sign board
      float open = smoothstep( 0.03, 0.05, f.x ) * smoothstep( 0.97, 0.95, f.x ) * step( 0.03, f.y ) * step( f.y, 0.7 );
      vec3 g = mix( vec3( 0.07, 0.09, 0.11 ), vec3( 0.3, 0.39, 0.45 ), f.y );
      g *= 1.0 - 0.5 * ( 1.0 - smoothstep( 0.0, 0.02, abs( f.x - 0.5 ) ) );
      float sign = step( 0.74, f.y ) * step( f.y, 0.94 ) * step( 0.3, bay );
      vec3 signCol = bay < 0.48 ? vec3( 0.72, 0.13, 0.1 ) : bay < 0.64 ? vec3( 0.1, 0.3, 0.58 ) : bay < 0.8 ? vec3( 0.93, 0.74, 0.12 ) : vec3( 0.9, 0.9, 0.88 );
      col = mix( col, g, open );
      col = mix( col, signCol, sign );
      hueGlass = open * detail;
      hueLit = open * step( seed, 0.4 ) * 0.7;
    } else {
      float balc = step( bay, 0.3 );
      float band = step( 0.36, f.y ) * step( f.y, 0.8 ) * smoothstep( 0.02, 0.04, f.x ) * smoothstep( 0.98, 0.96, f.x );
      vec3 glass = mix( vec3( 0.08, 0.13, 0.17 ), vec3( 0.4, 0.55, 0.66 ), smoothstep( 0.36, 0.8, f.y ) );
      glass *= 1.0 - 0.5 * ( 1.0 - smoothstep( 0.0, 0.018, abs( f.x - 0.5 ) ) );
      // balcony bays: a recessed door behind a slab and a rail
      float recess = step( 0.1, f.x ) * step( f.x, 0.9 ) * step( 0.07, f.y ) * step( f.y, 0.84 );
      vec3 rc = mix( vec3( 0.1, 0.11, 0.12 ), vec3( 0.26, 0.33, 0.38 ), smoothstep( 0.3, 0.84, f.y ) );
      float rail = step( 0.07, f.y ) * step( f.y, 0.33 ) * step( 0.06, f.x ) * step( f.x, 0.94 );
      rc = mix( rc, base * 1.08, rail * ( 0.55 + 0.45 * step( 0.5, fract( f.x * 12.0 ) ) ) );
      float win = mix( band, recess, balc );
      col = mix( col, mix( glass, rc, balc ), win );
      col = mix( col, base * 1.12, balc * step( f.y, 0.07 ) );
      // an air-conditioner under some windows
      float ac = ( 1.0 - balc ) * step( 0.62, seed ) * step( 0.7, f.x ) * step( f.x, 0.9 ) * step( 0.12, f.y ) * step( f.y, 0.27 );
      col = mix( col, vec3( 0.78, 0.79, 0.78 ) * ( 0.8 + 0.2 * step( 0.5, fract( f.y * 30.0 ) ) ), ac );
      col *= 1.0 - 0.1 * ( 1.0 - smoothstep( 0.0, 0.03, f.y ) );
      hueGlass = win * ( 1.0 - balc * rail ) * detail;
      hueLit = win * step( seed, litP ) * litK * ( 1.0 - balc * rail );
    }
  } else if ( cell.y < 0.5 && !civic ) {
    // street level: a shopfront or doorway under an awning
    float open = smoothstep( 0.1, 0.14, f.x ) * smoothstep( 0.9, 0.86, f.x ) * smoothstep( 0.02, 0.05, f.y ) * smoothstep( 0.72, 0.68, f.y );
    float awn = smoothstep( 0.04, 0.08, f.x ) * smoothstep( 0.96, 0.92, f.x ) * smoothstep( 0.7, 0.73, f.y ) * smoothstep( 0.86, 0.83, f.y );
    vec3 awnCol = bay < 0.25 ? vec3( 0.55, 0.16, 0.12 ) : bay < 0.5 ? vec3( 0.14, 0.32, 0.42 ) : bay < 0.75 ? vec3( 0.72, 0.56, 0.2 ) : vec3( 0.2, 0.38, 0.26 );
    awnCol *= 0.85 + 0.3 * step( 0.5, fract( uv.x * 9.0 ) );
    vec3 inside = mix( vec3( 0.05, 0.045, 0.045 ), vec3( 0.2, 0.15, 0.11 ), smoothstep( 0.0, 0.7, f.y ) * 0.6 );
    col = mix( col, inside, open * step( 0.22, bay ) );
    col = mix( col, awnCol, awn * step( 0.4, bay ) );
    hueLit = open * step( 0.22, bay ) * step( seed, 0.36 ) * 0.7;
    hueHgt -= 0.2 * open * step( 0.22, bay ) * detail;
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
    // the opening is recessed: the lintel and one jamb throw a shadow onto the glass
    float reveal = max( smoothstep( 0.7, 0.78, f.y ), 1.0 - smoothstep( 0.26, 0.33, f.x ) );
    glass *= 1.0 - 0.5 * reveal;
    shutCol *= 1.0 - 0.3 * reveal;
    col = mix( col, mix( glass, shutCol, shut ), win );
    hueGlass = win * ( 1.0 - shut ) * detail;
    // floor line
    col *= 1.0 - 0.14 * ( 1.0 - smoothstep( 0.0, 0.035, f.y ) );
    hueLit = win * ( 1.0 - shut ) * step( seed, litP ) * litK;
  }
  diffuseColor.rgb = mix( base * 0.9, col, detail );
  // age: damp rising from the ground and mould under the eaves — old lime-washed walls are never one colour
  float damp = ( 1.0 - smoothstep( 0.0, 1.6, hueH ) ) * ( 0.45 + 0.55 * hueNoise( vec2( uv.x * 3.1, 2.0 ) ) );
  float mould = hueNoise( vec2( uv.x * 1.3 + 5.0, uv.y * 0.35 ) ) * hueNoise( vec2( uv.x * 5.7, uv.y * 1.1 + 3.0 ) );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.62, 0.7, 0.56 ), clamp( damp * 0.75 + smoothstep( 0.22, 0.5, mould ) * 0.4, 0.0, 0.8 ) * hueWall * ( modern ? 0.3 : 1.0 ) );
  hueLit = mix( 0.02 + 0.045 * hood, hueLit, detail ) * step( 0.5, hueWall ) * step( 0.3, hueH );
  hueRough = modern ? 0.8 : 0.9;
  // plaster is never flat; openings sit back from the wall face
  hueHgt += ( 0.006 * hueNoise( uv * vec2( 31.0, 37.0 ) ) + 0.012 * hueNoise( uv * vec2( 5.0, 7.0 ) ) ) * detail - 0.07 * hueGlass;
  float roomK = hueGlass * ( 1.0 - smoothstep( 0.04, 0.22, fw ) ) * ( 1.0 - uLook );
  if ( roomK > 0.01 ) {
    vec3 rv = normalize( vWPos - cameraPosition );
    vec3 room = hueRoom( f, vec3( dot( rv.xz, t ), rv.y, -dot( rv, hueN ) ), vec2( 2.9, 3.4 ), cell.y < 0.5 ? 6.0 : 4.2, hueHash( cell + side + 1.7 ) );
    // a curtain or blind drawn part of the way on some windows
    float blind = step( 0.55, hueHash( cell + side + 5.3 ) ) * step( 0.78 - 0.3 * hueHash( cell + 8.1 ), f.y ) * step( 0.5, cell.y );
    room = mix( room, vec3( 0.8, 0.76, 0.66 ), blind * 0.9 );
    diffuseColor.rgb = mix( diffuseColor.rgb, room * 0.42 * ( 0.75 + 0.25 * smoothstep( 0.0, 0.02, abs( f.x - 0.5 ) ) ), roomK * 0.86 );
    hueRoomC = mix( vec3( 1.0 ), room * 1.7, roomK );
  }
  hueRough = mix( hueRough, 0.07, hueGlass * ( 1.0 - uLook ) );
  hueMetal = 0.1 * hueGlass * ( 1.0 - uLook );
} else if ( ( vKind > 1.5 && vKind < 2.5 ) || ( vKind > 8.5 && vKind < 9.5 ) ) {
  // ---------------- roof tiles (kind 9: glazed imperial tiles, which catch the sun) ----------------
  // abs: the underside of an eave or a canopy faces straight down, and cross( down, up ) is zero, which normalize()
  // turns into NaN; post's focus blur and bloom then spread that one pixel over the whole canvas (see post.js)
  vec3 e = abs( hueN.y ) > 0.985 ? vec3( 1.0, 0.0, 0.0 ) : normalize( cross( hueN, vec3( 0.0, 1.0, 0.0 ) ) );
  vec3 s = cross( e, hueN );
  vec2 uv = vec2( dot( vWPos, e ) / 1.15, dot( vWPos, s ) / 1.5 );
  float fw = fwidth( uv.x ) + fwidth( uv.y );
  float detail = 1.0 - smoothstep( 0.35, 1.2, fw );
  float ridge = pow( abs( sin( 3.14159 * uv.x ) ), 0.6 );
  float course = smoothstep( 0.0, 0.16, fract( uv.y ) );
  float jit = hueHash( floor( uv ) );
  float shade = ( 0.5 + 0.62 * ridge ) * ( 0.66 + 0.34 * course ) * ( 0.88 + 0.24 * jit );
  // drawn: a flat wash hatched down the slope, the pen lifting here and there
  float hatch = ( 1.0 - smoothstep( 0.0, 0.2, abs( sin( 3.14159 * uv.x ) ) ) ) * step( 0.2, hueHash( floor( vec2( uv.x, uv.y * 0.4 ) ) ) );
  shade = mix( shade, 1.08 - 0.48 * hatch, uLook );
  // age: darker patches, lighter where rain has washed the ridges
  hueRib = normalize( hueN + e * cos( 3.14159 * uv.x ) * 0.55 * detail );
  // each course laps the one below: the lip tips the tile a little down the slope
  hueNp = normalize( hueRib - s * ( 1.0 - course ) * 0.5 * detail );
  hueGlaze = vKind > 8.5 ? 1.0 : 0.1;
  float age = hueNoise( vWPos.xz * 0.45 ) * 0.6 + hueNoise( vWPos.xz * 1.7 ) * 0.4;
  diffuseColor.rgb *= mix( 0.9, shade, detail ) * ( 0.78 + 0.36 * age );
  // lichen and soot where tiles stay damp
  float moss = hueNoise( vWPos.xz * 0.23 + 31.0 ) * 0.65 + hueNoise( vWPos.xz * 1.1 + 7.0 ) * 0.35;
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.56, 0.66, 0.5 ), smoothstep( 0.42, 0.78, moss ) * 0.6 );
  // soot-dark courses near the eaves, where old tiles hold water longest
  diffuseColor.rgb *= 1.0 - 0.18 * smoothstep( 0.6, 0.95, hueNoise( vWPos.xz * 2.7 ) );
  // glazed imperial tile keeps a ceramic sheen where moss has not taken it; clay tile is matt
  hueRough = vKind > 8.5 ? mix( 0.27, 0.6, smoothstep( 0.42, 0.78, moss ) ) : mix( 0.66, 0.9, age );
  hueMetal = vKind > 8.5 ? 0.04 : 0.0;
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
  hueRough = 0.93;
  hueHgt = ( -0.03 * joint + 0.012 * jit + 0.008 * hueNoise( vec2( along, vWPos.y ) * 9.0 ) ) * detail * detail;
} else if ( vKind > 4.5 && vKind < 5.5 ) {
  // ---------------- planted ground ----------------
  float g = hueNoise( vWPos.xz * 0.11 ) * 0.6 + hueNoise( vWPos.xz * 0.9 ) * 0.25 + hueNoise( vWPos.xz * 5.0 ) * 0.15;
  diffuseColor.rgb *= 0.82 + 0.34 * g;
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.1, 1.04, 0.8 ), smoothstep( 0.55, 0.9, g ) * 0.4 );
  hueRough = 0.96;
  if ( uLook > 0.5 ) {
    // drawn grass: small pen marks scattered over the wash
    vec2 gc = vWPos.xz / 2.3, gi = floor( gc );
    vec2 gf = fract( gc ) - 0.5 + ( vec2( hueHash( gi + 3.1 ), hueHash( gi + 7.7 ) ) - 0.5 ) * 0.5;
    float gtick = ( 1.0 - smoothstep( 0.02, 0.055, abs( gf.y + 0.08 - abs( gf.x ) * 1.4 ) ) ) * step( abs( gf.x ), 0.13 ) * step( 0.6, hueHash( gi ) ) * ( 1.0 - smoothstep( 0.12, 0.45, fwidth( gc.x ) + fwidth( gc.y ) ) );
    diffuseColor.rgb *= 1.0 - 0.34 * gtick;
  }
} else if ( vKind > 5.5 && vKind < 6.5 ) {
  // ---------------- paving ----------------
  diffuseColor.rgb *= 0.93 + 0.1 * hueNoise( vWPos.xz * 0.7 ) + 0.04 * hueNoise( vWPos.xz * 7.0 );
  hueRough = 0.84;
  #ifndef HUE_OVERLAY
  if ( hueH > 0.3 && hueN.y > 0.7 ) {
    // terraces and platforms are laid in flagstones (đá thanh, gạch Bát Tràng): staggered joints, each stone its own tone
    vec2 pv = vWPos.xz / 1.5;
    pv.x += step( 0.5, fract( pv.y * 0.5 ) ) * 0.5;
    vec2 pf = abs( fract( pv ) - 0.5 );
    float pw = fwidth( pv.x ) + fwidth( pv.y );
    float near = 1.0 - smoothstep( 0.06, 0.26, pw );
    diffuseColor.rgb *= 1.0 - 0.2 * smoothstep( 0.45, 0.5, max( pf.x, pf.y ) ) * near;
    diffuseColor.rgb *= 1.0 + ( hueHash( floor( pv ) ) - 0.5 ) * 0.1 * near;
    hueHgt = -0.02 * smoothstep( 0.45, 0.5, max( pf.x, pf.y ) ) * near * near;
  }
  #endif
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
  hueRough = mix( 0.48, 0.74, panel ); // lacquer on the columns, dull panels
  hueHgt = ( 0.06 * column - 0.03 * panel ) * detail;
  hueLit = panel * 0.16 * detail * step( 0.3, hueH ) * step( hueHash( hueCell + 2.3 ), 0.38 ); // a lamp behind some of the doors, not all
} else if ( vKind > 2.5 && vKind < 3.5 ) {
  // ---------------- flat roofs ----------------
  float c = hueNoise( vWPos.xz * 0.5 ) * 0.6 + hueNoise( vWPos.xz * 3.0 ) * 0.4;
  diffuseColor.rgb *= 0.84 + 0.26 * c;
  hueRough = 0.9;
} else if ( vKind > 11.5 ) {
  // ---------------- a line laid on the ground (kerbs, road edges): a stone joint, or the pen in the drawn look ----------------
  // once a pixel covers more than the line is wide it would only sparkle, so it thins out into what lies under it
  float lpx = fwidth( vWPos.x ) + fwidth( vWPos.z );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.075, 0.055, 0.05 ), uLook * 0.8 * ( 1.0 - smoothstep( 0.5, 2.2, lpx ) ) );
} else {
  diffuseColor.rgb *= mix( 1.0, mix( 0.78, 1.0, smoothstep( 0.0, 5.0, hueH ) ), hueWall * step( 0.0, hueH ) );
}
{
  // relief to normal: the height's screen-space slope, laid back into the surface
  vec3 hdx = dFdx( vWPos ), hdy = dFdy( vWPos );
  vec3 hr1 = cross( hdy, hueN ), hr2 = cross( hueN, hdx );
  float hdet = dot( hdx, hr1 );
  vec3 hgrad = sign( hdet ) * ( dFdx( hueHgt ) * hr1 + dFdy( hueHgt ) * hr2 );
  hgrad *= min( 1.0, 1.4 * abs( hdet ) / ( length( hgrad ) + 1e-6 ) );
  hueNp = normalize( abs( hdet ) * hueNp - hgrad + 1e-6 * hueN );
}
#endif
// rain darkens what it soaks: ground and roofs most, walls a little
diffuseColor.rgb *= 1.0 - uWet * mix( 0.26, 0.1, hueWall );
// and leaves a film that mirrors the sky on hard surfaces (paving, stone, roofs); grass and parks stay damp, never mirror-bright
float huePuddle = smoothstep( 0.35, 0.72, hueNoise( vWPos.xz * 0.18 ) * 0.65 + hueNoise( vWPos.xz * 0.85 ) * 0.35 );
float hueWetSurf = smoothstep( 0.25, 0.85, hueN.y ) * mix( 0.35, 1.0, huePuddle );
float hueHard = 1.0;
#ifdef HUE_FOLIAGE
hueHard = 0.0;
#else
if ( vKind > 4.5 && vKind < 5.5 ) hueHard = 0.0;
#endif
hueRough = mix( hueRough, mix( 0.42, 0.14, hueHard ), hueWetSurf * uWet * mix( 0.55, 0.8, hueHard ) );
if ( hueHard < 0.5 ) hueRough = max( hueRough, 0.38 );
if ( uLook > 0.5 ) { hueRough = 1.0; hueMetal = 0.0; hueNp = hueN; }
`;

// Trees: the instance colour is the crown's. Trunks and limbs (aKind 0, see PART in foliage.js) keep their baked bark.
const FOLIAGE_COLOR = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
  vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR
  vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
  if ( aKind > 0.5 ) vColor.rgb *= instanceColor.rgb;
#endif`;

// PBR material for baked vertex-colour geometry (colours are stored sqrt-encoded
// in 8 bits, see Buf.tri) with the procedural surface detail above.
export function cityMaterial({ windows = false, foliage = false, styled = false, overlay = false, ...opts } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, ...opts });
  m.defines = { ...(m.defines || {}) };
  if (windows) m.defines.HUE_WINDOWS = '';
  if (foliage) m.defines.HUE_FOLIAGE = '';
  if (styled) m.defines.HUE_STYLED = '';
  if (overlay) m.defines.HUE_OVERLAY = ''; // flat ribbons laid on the ground (streets): no flagstone joints
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = shared.uGlow;
    sh.uniforms.uLandY = shared.uLandY;
    sh.uniforms.uWet = shared.uWet;
    sh.uniforms.uSunDir = shared.uSunDir;
    sh.uniforms.uSunI = shared.uSunI;
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uWind = shared.uWind;
    sh.uniforms.uLook = shared.uLook;
    cascades(sh);
    sh.vertexShader = patch(sh.vertexShader)
      .replace('#include <common>', '#include <common>\nattribute float aKind;\nattribute float aBase;\n#ifdef HUE_STYLED\nattribute float aStyle;\n#endif\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nvarying float vKind;\nvarying float vBase;\nvarying float vFlood;\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND)
      .replace('#include <color_vertex>', foliage ? FOLIAGE_COLOR : '#include <color_vertex>')
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
          // KIND_FLOOD (64) rides on the kind: a floodlit facade (riverside lights after dark)
          vFlood = step( 63.5, aKind );
          float hueK = aKind - 64.0 * vFlood;
          #ifdef HUE_STYLED
            vKind = hueK + ( hueK > 0.5 && hueK < 1.5 ? aStyle : 0.0 ); // per-house facade family on instanced walls
          #else
            vKind = hueK;
          #endif
          vBase = aBase;
        }
        `,
      ).src;
    sh.fragmentShader = patch(sh.fragmentShader)
      .replace('#include <common>', '#include <common>\n' + COMMON)
      .replace('#include <color_fragment>', SURFACE)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = hueRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = hueMetal;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n#ifndef HUE_FOLIAGE\nnormal = normalize( normal + mat3( viewMatrix ) * ( hueNp - hueN ) );\n#endif')
      // drawn look: leaves mark themselves in the alpha channel, so post.js can outline a crown as one shape
      // and ribbons laid on the ground (streets, greens, yards) mark themselves as ground, as the land does (GROUND_A)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n#ifdef HUE_FOLIAGE\nif ( uLook > 0.5 ) gl_FragColor.a = 0.0;\n#endif\n#ifdef HUE_OVERLAY\nif ( uLook > 0.5 ) gl_FragColor.a = ' + GROUND_A + ';\n#endif')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        #ifndef HUE_FOLIAGE
        {
          // sun on glass and on glazed tile: small, sharp highlights that move as the camera does
          vec3 hueV = normalize( cameraPosition - vWPos );
          #ifndef USE_ENVMAP
          float gl = pow( max( dot( reflect( -hueV, hueN ), uSunDir ), 0.0 ), 70.0 ) * hueGlass * 1.4;
          float sh = pow( max( dot( reflect( -hueV, hueRib ), uSunDir ), 0.0 ), 16.0 ) * hueGlaze * 0.55;
          totalEmissiveRadiance += vec3( 1.0, 0.94, 0.82 ) * ( gl + sh ) * uSunI * 0.4 * ( 1.0 - uWet );
          #endif
          // mưa Huế: wet streets, roofs and terraces pick up the sky at a low angle, most where the water pools;
          // after dark the same film carries the lamps
          if ( uWet > 0.01 ) {
            // clamped at 1 too: two unit vectors that face each other can dot to 1 + 1e-7, and pow() of the
            // negative 1 - ndv is NaN, which the post chain spread over the whole canvas (see post.js)
            float ndv = clamp( dot( hueN, hueV ), 0.0, 1.0 );
            float fres = pow( 1.0 - ndv, 3.5 );
            float puddles = huePuddle, wetSurf = hueWetSurf * mix( 0.25, 1.0, hueHard );
            #ifndef USE_ENVMAP
            vec3 skyTint = mix( vec3( 0.52, 0.58, 0.66 ), vec3( 0.32, 0.28, 0.52 ), uGlow );
            totalEmissiveRadiance += skyTint * fres * wetSurf * uWet * 0.24;
            #endif
            totalEmissiveRadiance += vec3( 1.0, 0.72, 0.38 ) * fres * wetSurf * uWet * uGlow * puddles * 0.16;
          }
        }
        // riverside facade lighting (issue #21): warm uplighters at the foot of the walls, one every 5 m, each throwing
        // a cone that widens and fades as it climbs, over a soft general wash; the wall's own colour comes through
        if ( uGlow > 0.01 && vFlood > 0.5 ) {
          float hueUp = max( hueH, 0.0 );
          float hueRun = dot( vWPos.xz, normalize( vec2( -hueN.z, hueN.x ) + 1e-4 ) ); // metres along the wall
          float hueDx = abs( fract( hueRun / 5.0 ) - 0.5 ) * 5.0; // to the nearest fixture
          float hueW = 0.5 + hueUp * 0.28;
          float hueCone = exp( -hueDx * hueDx / ( hueW * hueW ) ) * exp( -hueUp / 11.0 ) * 1.4;
          float hueWash = 0.34 * exp( -hueUp / 24.0 );
          float hueFace = hueWall * step( -0.2, hueH );
          float fl = ( hueCone + hueWash ) * 0.62;
          fl = fl / ( 1.0 + fl * 0.6 );
          totalEmissiveRadiance += diffuseColor.rgb * vec3( 1.0, 0.64, 0.3 ) * fl * hueFace * uGlow;
        }
        #else
        {
          // leaves let the low sun through: crowns between the camera and the sun take a warm rim
          vec3 hueV = normalize( cameraPosition - vWPos );
          float back = pow( max( dot( -hueV, uSunDir ), 0.0 ), 3.5 ) * smoothstep( -0.1, 0.6, normalize( vWNrm ).y );
          totalEmissiveRadiance += diffuseColor.rgb * vec3( 1.25, 1.15, 0.65 ) * back * uSunI * 0.16 * ( 1.0 - uWet ) * ( 1.0 - uGlow );
          // and scatter it about inside the crown, so the shaded side of a tree is green, not black
          totalEmissiveRadiance += diffuseColor.rgb * vec3( 1.0, 0.97, 0.8 ) * uSunI * 0.1;
        }
        #endif
        #ifdef HUE_WINDOWS
        if ( uGlow > 0.01 ) {
          // mostly warm bulbs, some greenish tube light, the odd blue of a television
          float tone = hueHash( hueCell + 9.1 );
          vec3 lamp = tone < 0.72 ? mix( vec3( 1.0, 0.56, 0.24 ), vec3( 1.0, 0.8, 0.5 ), tone / 0.72 ) : tone < 0.93 ? vec3( 0.76, 0.95, 0.86 ) : vec3( 0.5, 0.66, 1.0 );
          totalEmissiveRadiance += lamp * hueLit * uGlow * 1.05 * hueRoomC;
        }
        #endif`,
      ).src;
  };
  m.customProgramCacheKey = () => 'hue-city-' + (windows ? 'w' : 'p') + (foliage ? 'f' : '') + (styled ? 's' : '') + (overlay ? 'o' : '');
  return m;
}

// The land slab: broad tonal drift plus fine grain, so open ground is not one flat colour.
// bank: the cut faces of the slab along the river and the ponds, drawn as old embankment — dark and wet at the
// waterline, stone courses above, moss hanging over from the grass at the rim.
export function landMaterial(color, turf = false, bank = false) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
  m.defines = { ...( m.defines || {} ) };
  if (turf) m.defines.HUE_TURF = '';
  if (bank) m.defines.HUE_BANK = '';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWet = shared.uWet;
    sh.uniforms.uLook = shared.uLook;
    cascades(sh);
    sh.vertexShader = patch(sh.vertexShader)
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;').src;
    sh.fragmentShader = patch(sh.fragmentShader)
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos; uniform float uWet; uniform float uLook;
        float lHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
        float lNoiseRaw( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
          return ( mix( mix( lHash( i ), lHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( lHash( i + vec2( 0.0, 1.0 ) ), lHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ) ); }
        // the drawn look lays flat washes: tonal drift settles most of the way to its middle
        float lNoise( vec2 p ) { return mix( lNoiseRaw( p ), 0.5, uLook * 0.78 ); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // gardens and bare earth: Huế's plots are more green than paved
        float lg = lNoise( vWPos.xz * 0.012 ) * 0.5 + lNoise( vWPos.xz * 0.09 ) * 0.3 + lNoise( vWPos.xz * 0.9 ) * 0.2;
        float grassN = lNoiseRaw( vWPos.xz * 0.035 + 4.0 ) * 0.6 + lNoiseRaw( vWPos.xz * 0.21 ) * 0.4;
        // drawn: grass and bare earth are two washes with an edge between them, not a gradient
        float grass = mix( smoothstep( 0.38, 0.62, grassN ), smoothstep( 0.485, 0.515, grassN ), uLook );
        vec3 turf = vec3( 0.37, 0.5, 0.24 ) * ( 0.8 + 0.4 * lNoise( vWPos.xz * 1.3 ) );
        #ifdef HUE_TURF
          diffuseColor.rgb = mix( diffuseColor.rgb, turf, grass * 0.62 );
          if ( uLook > 0.5 ) {
            vec2 gc = vWPos.xz / 2.3, gi = floor( gc );
            vec2 gf = fract( gc ) - 0.5 + ( vec2( lHash( gi + 3.1 ), lHash( gi + 7.7 ) ) - 0.5 ) * 0.5;
            float gtick = ( 1.0 - smoothstep( 0.02, 0.055, abs( gf.y + 0.08 - abs( gf.x ) * 1.4 ) ) ) * step( abs( gf.x ), 0.13 ) * step( 0.6, lHash( gi ) ) * ( 1.0 - smoothstep( 0.12, 0.45, fwidth( gc.x ) + fwidth( gc.y ) ) );
            diffuseColor.rgb *= 1.0 - 0.3 * gtick * grass;
          }
        #endif
        diffuseColor.rgb *= 0.86 + 0.26 * lg;
        #ifdef HUE_BANK
        {
          float by = vWPos.y, bu = ( vWPos.x + vWPos.z ) * 0.72;
          float near = 1.0 - smoothstep( 0.1, 0.45, fwidth( by ) * 3.0 );
          // stone courses with staggered joints
          float course = by / 0.62;
          float seam = smoothstep( 0.44, 0.5, abs( fract( course ) - 0.5 ) );
          float vj = smoothstep( 0.46, 0.5, abs( fract( bu / 1.5 + step( 0.5, fract( course * 0.5 ) ) * 0.5 ) - 0.5 ) );
          diffuseColor.rgb *= 1.0 - 0.2 * max( seam, vj ) * near;
          diffuseColor.rgb *= 0.9 + 0.2 * lNoise( vec2( floor( bu / 1.5 ) * 7.3, floor( course ) * 3.1 ) );
          // the river's mark: dark, slightly green stone up to an uneven tide line
          float wetl = 1.0 - smoothstep( 0.25, 1.25 + 0.6 * lNoise( vec2( bu * 0.12, 2.0 ) ), by );
          diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.42, 0.5, 0.42 ), wetl );
          // moss and grass hanging over the rim
          float rim = smoothstep( ${(LAND_Y - 1.25).toFixed(2)} - 0.5 * lNoise( vec2( bu * 0.25, 5.0 ) ), ${(LAND_Y - 0.08).toFixed(2)}, by );
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.36, 0.48, 0.26 ) * ( 0.8 + 0.4 * lNoise( vec2( bu * 1.1, by * 2.0 ) ) ), rim * 0.78 );
        }
        #endif
        diffuseColor.rgb *= 1.0 - uWet * 0.26;
        float lpud = smoothstep( 0.35, 0.72, lNoise( vWPos.xz * 0.18 ) * 0.65 + lNoise( vWPos.xz * 0.85 ) * 0.35 );`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = uLook > 0.5 ? 1.0 : max( 0.38, mix( roughnessFactor, 0.42, lpud * uWet * 0.65 ) );')
      // drawn look: the ground's top (the slab and the hills) marks itself in the alpha channel (GROUND_A)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n#ifdef HUE_TURF\nif ( uLook > 0.5 ) gl_FragColor.a = ' + GROUND_A + ';\n#endif')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // rain pools on open ground and catches the sky at a low angle
        if ( uWet > 0.01 ) {
          #ifndef USE_ENVMAP
          float lndv = min( abs( dot( normal, normalize( vViewPosition ) ) ), 1.0 ); // pow() of a negative is NaN
          totalEmissiveRadiance += vec3( 0.5, 0.56, 0.64 ) * pow( 1.0 - lndv, 3.5 ) * lpud * uWet * 0.16;
          #endif
        }`,
      ).src;
  };
  m.customProgramCacheKey = () => 'hue-land' + (turf ? '-turf' : '') + (bank ? '-bank' : '');
  return m;
}

// sqrt-encode a linear [r,g,b] for instanceColor (the shader squares it back)
export const enc = (c, target = new THREE.Color()) => target.setRGB(Math.sqrt(c[0]), Math.sqrt(c[1]), Math.sqrt(c[2]), THREE.LinearSRGBColorSpace);

// Shadow-pass material for the tree cards: the same cut-out, and the same wind, so shadows sway with the crowns.
// (depthPacking only matters if the shadow type is ever VSM: other types render into a native depth texture.)
export function foliageDepthMaterial(opts) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, ...opts });
  m.defines = { ...(m.defines || {}), HUE_FOLIAGE: '' };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.uTime;
    sh.uniforms.uWind = shared.uWind;
    sh.vertexShader = patch(sh.vertexShader)
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND).src;
  };
  m.customProgramCacheKey = () => 'hue-foliage-depth';
  return m;
}

// Architectural lighting: strips of light laid along a structure. Geometry, so the river mirrors them; they
// follow the mood's glow and vanish by day. `boost` above 1 pushes them into the bloom.
export function lightMaterial(color = 0xffffff, boost = 1.6) {
  return new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uColor: { value: new THREE.Color(color) }, uBoost: { value: boost } },
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `
      uniform vec3 uColor; uniform float uGlow, uBoost;
      void main() {
        gl_FragColor = vec4( uColor * uBoost * uGlow, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    transparent: true,
  });
}

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
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    transparent: true,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 20;
  return pts;
}
