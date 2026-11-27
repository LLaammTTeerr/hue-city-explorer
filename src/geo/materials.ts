import * as THREE from 'three';
import { LAND_Y } from '../config.ts';

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
  uPost: { value: 0 }, // 1 while post.ts renders into its HalfFloat target (enables alpha-channel ink masks), 0 when drawing directly to the canvas
  uSpring: { value: 0 }, // 0..1 Spring / Tết (fresh green + golden hoàng mai & đào blossoms)
  uAutumn: { value: 0 }, // 0..1 Autumn (warm honey-gold, amber & russet foliage)
  uWinter: { value: 0 }, // 0..1 Winter (cool misty Huế cypress & silvery-sage foliage)
};

// In the drawn look the ground (the slab, the hills and the streets, greens and yards laid on them, none of which
// write depth) writes this alpha, so the ink in post.js can tell it from built form: its 25 m triangles fold by
// 10-25 degrees on the hills, and seen through a street those folds drew as triangles. Leaves write 0, the rest 1.
// GLSL float literal; post.js reads it back as the band 0.9-0.965 (all four MSAA samples on ground).
export const GROUND_A = '0.96';
import { WIND, COMMON, SURFACE, FOLIAGE_COLOR } from './shaders/city-surface.ts';
import { createLightMaterials } from './shaders/lights.ts';

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

// PBR material for baked vertex-colour geometry (colours are stored sqrt-encoded
// in 8 bits, see Buf.tri) with the procedural surface detail above.
export function cityMaterial({ windows = false, foliage = false, styled = false, overlay = false, hero = false, ...opts }: Record<string, any> = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, ...opts });
  mat.defines = { ...(mat.defines || {}) };
  if (windows) mat.defines.HUE_WINDOWS = '';
  if (foliage) mat.defines.HUE_FOLIAGE = '';
  if (styled) mat.defines.HUE_STYLED = '';
  if (overlay) mat.defines.HUE_OVERLAY = ''; // flat ribbons laid on the ground (streets): no flagstone joints
  if (hero) mat.defines.HUE_HERO = ''; // hero GLB sculptural accents: metallic/ceramic sheen on gilded/bronze/jade parts
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGlow = shared.uGlow;
    shader.uniforms.uLandY = shared.uLandY;
    shader.uniforms.uWet = shared.uWet;
    shader.uniforms.uSunDir = shared.uSunDir;
    shader.uniforms.uSunI = shared.uSunI;
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uWind = shared.uWind;
    shader.uniforms.uLook = shared.uLook;
    shader.uniforms.uPost = shared.uPost;
    shader.uniforms.uSpring = shared.uSpring;
    shader.uniforms.uAutumn = shared.uAutumn;
    shader.uniforms.uWinter = shared.uWinter;
    cascades(shader);
    shader.vertexShader = patch(shader.vertexShader)
      .replace('#include <common>', '#include <common>\nattribute float aKind;\nattribute float aBase;\n#ifdef HUE_STYLED\nattribute float aStyle;\n#endif\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nvarying float vKind;\nvarying float vBase;\nvarying float vFlood;\nvarying float vTreeSeed;\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND)
      .replace('#include <color_vertex>', foliage ? FOLIAGE_COLOR : '#include <color_vertex>')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec4 wp = vec4( transformed, 1.0 );
          vec3 wn = objectNormal;
          vTreeSeed = 0.5;
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
            mat3 im = mat3( instanceMatrix );
            wn /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
            wn = im * wn;
            vTreeSeed = fract( sin( dot( instanceMatrix[ 3 ].xz, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
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
    shader.fragmentShader = patch(shader.fragmentShader)
      .replace('#include <common>', '#include <common>\n' + COMMON)
      .replace('#include <color_fragment>', SURFACE)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = hueRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = hueMetal;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n#ifndef HUE_FOLIAGE\nnormal = normalize( normal + mat3( viewMatrix ) * ( hueNp - hueN ) );\n#endif')
      // drawn look: leaves mark themselves in the alpha channel, so post.js can outline a crown as one shape
      // and ribbons laid on the ground (streets, greens, yards) mark themselves as ground, as the land does (GROUND_A);
      // gated on uPost so direct-to-canvas mobile rendering keeps gl_FragColor.a = 1.0 and never punches through to body paper
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n#ifdef HUE_FOLIAGE\nif ( uLook > 0.5 && uPost > 0.5 ) gl_FragColor.a = 0.0;\n#endif\n#ifdef HUE_OVERLAY\nif ( uLook > 0.5 && uPost > 0.5 ) gl_FragColor.a = ' + GROUND_A + ';\n#endif')
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
            float realSheen = 1.0 - uLook * 0.75;
            #ifndef USE_ENVMAP
            vec3 skyTint = mix( vec3( 0.52, 0.58, 0.66 ), vec3( 0.32, 0.28, 0.52 ), uGlow );
            totalEmissiveRadiance += skyTint * fres * wetSurf * uWet * mix( 0.12, 0.07, huePaved ) * realSheen;
            #endif
            totalEmissiveRadiance += vec3( 1.0, 0.72, 0.38 ) * fres * wetSurf * uWet * uGlow * puddles * 0.12 * realSheen;
          }
        }
        // riverside facade lighting (issue #21): gentle warm uplighters grazing the lower walls, never bleaching whole buildings white
        if ( uGlow > 0.01 && vFlood > 0.5 ) {
          float hueUp = max( hueH, 0.0 );
          float hueRun = dot( vWPos.xz, normalize( vec2( -hueN.z, hueN.x ) + 1e-4 ) ); // metres along the wall
          float hueDx = abs( fract( hueRun / 5.0 ) - 0.5 ) * 5.0; // to the nearest fixture
          float hueW = 0.55 + hueUp * 0.30;
          float hueCone = exp( -hueDx * hueDx / ( hueW * hueW ) ) * exp( -hueUp / 7.5 ) * 0.85;
          float hueWash = 0.22 * exp( -hueUp / 14.0 );
          float hueFace = hueWall * step( -0.2, hueH );
          float fl = ( hueCone + hueWash ) * 0.26;
          fl = fl / ( 1.0 + fl * 1.4 );
          totalEmissiveRadiance += min( diffuseColor.rgb, vec3( 0.70 ) ) * vec3( 1.0, 0.66, 0.34 ) * fl * hueFace * uGlow;
        }
        // citywide streetlamp pools on paved streets/bridges and soft warm bounce onto lower house walls
        if ( uGlow > 0.01 ) {
          #ifdef HUE_OVERLAY
          if ( huePaved > 0.5 ) {
            vec2 lampCell = floor( vWPos.xz / 26.0 );
            vec2 lampJit = ( vec2( hueHash( lampCell + 1.3 ), hueHash( lampCell + 5.7 ) ) - 0.5 ) * 7.5;
            vec2 lampDelta = ( fract( vWPos.xz / 26.0 ) - 0.5 ) * 26.0 - lampJit;
            float lampPool = exp( -dot( lampDelta, lampDelta ) / 145.0 );
            float ambientStreet = 0.24 + 0.76 * lampPool;
            vec3 litPave = mix( diffuseColor.rgb, vec3( 0.42, 0.39, 0.35 ), 0.68 );
            totalEmissiveRadiance += litPave * vec3( 1.0, 0.71, 0.36 ) * ambientStreet * uGlow * 0.44;
          }
          #else
          if ( hueWall > 0.5 && hueH > -0.2 && hueH < 6.0 ) {
            float streetBounce = exp( -max( hueH, 0.0 ) / 3.5 ) * ( 0.65 + 0.35 * hueNoise( vWPos.xz * 0.06 ) );
            totalEmissiveRadiance += min( diffuseColor.rgb, vec3( 0.72 ) ) * vec3( 1.0, 0.70, 0.36 ) * streetBounce * uGlow * 0.14;
          } else if ( huePaved > 0.5 && hueN.y > 0.7 ) {
            vec2 deckCell = floor( vWPos.xz / 28.0 );
            vec2 deckDelta = ( fract( vWPos.xz / 28.0 ) - 0.5 ) * 28.0;
            float deckPool = 0.28 + 0.72 * exp( -dot( deckDelta, deckDelta ) / 155.0 );
            vec3 litDeck = mix( diffuseColor.rgb, vec3( 0.40, 0.37, 0.34 ), 0.60 );
            totalEmissiveRadiance += min( litDeck, vec3( 0.52 ) ) * vec3( 1.0, 0.71, 0.36 ) * deckPool * uGlow * 0.30;
          }
          #endif
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
          // mostly warm bulbs, some greenish tube light, the odd blue of a television — soft-compressed so panes never glare
          float tone = hueHash( hueCell + 9.1 );
          vec3 lamp = tone < 0.76 ? mix( vec3( 1.0, 0.58, 0.26 ), vec3( 1.0, 0.80, 0.50 ), tone / 0.76 ) : tone < 0.94 ? vec3( 0.76, 0.93, 0.84 ) : vec3( 0.54, 0.68, 0.98 );
          vec3 winGlow = lamp * hueLit * uGlow * 0.80 * min( hueRoomC, vec3( 1.15 ) );
          totalEmissiveRadiance += winGlow / ( 1.0 + max( winGlow.r, max( winGlow.g, winGlow.b ) ) * 0.35 );
        }
        #endif`,
      ).src;
  };
  mat.customProgramCacheKey = () => 'hue-city-' + (windows ? 'w' : 'p') + (foliage ? 'f' : '') + (styled ? 's' : '') + (overlay ? 'o' : '') + (hero ? 'h' : '');
  return mat;
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
    sh.uniforms.uPost = shared.uPost;
    cascades(sh);
    sh.vertexShader = patch(sh.vertexShader)
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;').src;
    sh.fragmentShader = patch(sh.fragmentShader)
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos; uniform float uWet; uniform float uLook; uniform float uPost;
        float lHash( vec2 p ) { p = fract( mod( p, 2048.0 ) * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
        float lHashI( vec2 i ) {
          uvec2 q = uvec2( ivec2( i ) ) * uvec2( 1597334673u, 3812015801u );
          uint n = ( q.x ^ q.y ) * 1597334673u;
          return float( n >> 8 ) * ( 1.0 / 16777216.0 );
        }
        float lNoiseRaw( vec2 p ) {
          float fw = max( fwidth( p.x ), fwidth( p.y ) );
          if ( fw > 1.2 ) return 0.5;
          vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
          float n = mix( mix( lHashI( i ), lHashI( i + vec2( 1.0, 0.0 ) ), f.x ), mix( lHashI( i + vec2( 0.0, 1.0 ) ), lHashI( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
          return mix( n, 0.5, smoothstep( 0.35, 1.2, fw ) );
        }
        // the drawn look lays flat washes: tonal drift settles most of the way to its middle
        float lNoise( vec2 p ) { return mix( lNoiseRaw( p ), 0.5, uLook * 0.78 ); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Huế's garden-city fabric: home gardens, orchard plots, and weathered courtyards rather than bare pale sand
        float lg = lNoise( vWPos.xz * 0.012 ) * 0.45 + lNoise( vWPos.xz * 0.09 ) * 0.35 + lNoise( vWPos.xz * 0.9 ) * 0.2;
        float parcel = lNoiseRaw( vWPos.xz * 0.078 + 11.3 );
        float grassN = lNoiseRaw( vWPos.xz * 0.032 + 4.0 ) * 0.52 + lNoiseRaw( vWPos.xz * 0.19 ) * 0.28 + parcel * 0.20;
        float grass = mix( smoothstep( 0.28, 0.56, grassN ), smoothstep( 0.40, 0.49, grassN ), uLook * 0.65 );
        vec3 turf = mix( vec3( 0.33, 0.47, 0.22 ), vec3( 0.23, 0.37, 0.17 ), smoothstep( 0.42, 0.78, parcel ) ) * ( 0.84 + 0.32 * lNoise( vWPos.xz * 1.3 ) );
        vec3 courtyard = diffuseColor.rgb * mix( vec3( 0.84, 0.83, 0.79 ), vec3( 0.94, 0.91, 0.85 ), parcel );
        #ifdef HUE_TURF
          diffuseColor.rgb = mix( courtyard, turf, 0.24 + grass * 0.62 );
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
      // drawn look: the ground's top (the slab and the hills) marks itself in the alpha channel (GROUND_A) when post.ts is active
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n#ifdef HUE_TURF\nif ( uLook > 0.5 && uPost > 0.5 ) gl_FragColor.a = ' + GROUND_A + ';\n#endif')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // rain pools on open ground and catches the sky at a low angle
        if ( uWet > 0.01 ) {
          #ifndef USE_ENVMAP
          float lndv = min( abs( dot( normal, normalize( vViewPosition ) ) ), 1.0 ); // pow() of a negative is NaN
          totalEmissiveRadiance += vec3( 0.5, 0.56, 0.64 ) * pow( 1.0 - lndv, 3.5 ) * lpud * uWet * 0.12 * ( 1.0 - uLook * 0.75 );
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


export const { lightMaterial, glowPoints } = createLightMaterials(shared);
