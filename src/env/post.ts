import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;

const POST_CFG = {
  initialTargetSize: 4,
  minBufferSize: 2,
  msaaSamples: 2,
  defaultFocusM: 800,
  defaultAperture: 0.6,
  defaultMaxBlurPx: 8,
  dofMinMaxBlurPx: 4,
  dofHeightDivisor: 130,
  dofSkipCocPx: 0.7,
  penMinWidthPx: 1.3,
  penHeightDivisor: 620,
  bloomInitialStrength: 0.32,
  bloomRadius: 0.55,
  bloomThreshold: 1.0,
  bloomMinEnabledStrength: 0.08,
  vignetteBase: 0.15,
  vignetteNightBoost: 0.15,
  aoInkReduction: 0.3,
  aoWeatherReduction: 0.35,
  aoGlowWeight: 0.6,
  bloomBaseStrength: 0.3,
  bloomNightBoost: 0.3,
  bloomInkReduction: 0.55,
} as const;

// Ambient occlusion from the depth buffer alone (normals are rebuilt from depth, which suits
// flat-faced buildings), blurred with respect to depth, then multiplied in with a cool tint.
// The same pass applies a light grade and vignette.
class OcclusionPass extends Pass {
  camera: THREE.PerspectiveCamera;
  strength: number;
  aoRT: THREE.WebGLRenderTarget;
  blurRT: THREE.WebGLRenderTarget;
  aoMat: THREE.ShaderMaterial;
  blurMat: THREE.ShaderMaterial;
  compMat: THREE.ShaderMaterial;
  focus: number;
  aperture: number;
  compRT: THREE.WebGLRenderTarget;
  dofMat: THREE.ShaderMaterial;
  quad: FullScreenQuad;
  skipAO: boolean;
  whiteTex: THREE.DataTexture;

  constructor(camera: THREE.PerspectiveCamera) {
    super();
    this.camera = camera;
    this.strength = 1;
    const half = { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.aoRT = new THREE.WebGLRenderTarget(4, 4, half);
    this.blurRT = new THREE.WebGLRenderTarget(4, 4, half);
    const depthUniforms = () => ({ tDepth: { value: null }, uNearFar: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2() } });
    this.aoMat = new THREE.ShaderMaterial({
      uniforms: { ...depthUniforms(), uTan: { value: new THREE.Vector2() }, uProjScale: { value: 1 }, uStrength: { value: 1 } },
      vertexShader: VERT,
      depthTest: false, depthWrite: false,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tDepth; uniform vec2 uNearFar, uRes, uTan; uniform float uProjScale, uStrength;
        varying vec2 vUv;
        float viewZ( vec2 uv ) { return perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, uNearFar.x, uNearFar.y ); }
        vec3 viewPos( vec2 uv, float z ) { return vec3( ( uv * 2.0 - 1.0 ) * uTan * -z, z ); }
        float ign( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
        void main() {
          float d = texture2D( tDepth, vUv ).x;
          if ( d >= 0.999995 ) { gl_FragColor = vec4( 1.0 ); return; }
          float z = perspectiveDepthToViewZ( d, uNearFar.x, uNearFar.y );
          vec3 P = viewPos( vUv, z );
          vec2 px = 1.0 / uRes;
          vec3 Pr = viewPos( vUv + vec2( px.x, 0.0 ), viewZ( vUv + vec2( px.x, 0.0 ) ) );
          vec3 Pl = viewPos( vUv - vec2( px.x, 0.0 ), viewZ( vUv - vec2( px.x, 0.0 ) ) );
          vec3 Pu = viewPos( vUv + vec2( 0.0, px.y ), viewZ( vUv + vec2( 0.0, px.y ) ) );
          vec3 Pd = viewPos( vUv - vec2( 0.0, px.y ), viewZ( vUv - vec2( 0.0, px.y ) ) );
          vec3 dx = abs( Pr.z - P.z ) < abs( P.z - Pl.z ) ? Pr - P : P - Pl;
          vec3 dy = abs( Pu.z - P.z ) < abs( P.z - Pd.z ) ? Pu - P : P - Pd;
          vec3 cr = cross( dx, dy );
          float cl = length( cr );
          vec3 N = cl > 1e-6 ? cr / cl : vec3( 0.0, 0.0, 1.0 );
          float dist = -z;
          // world radius grows with distance: door-step shadows up close, street-canyon shading from the air
          float R = clamp( dist * 0.019, 1.3, 28.0 );
          float rpx = min( R * uProjScale / dist, 56.0 );
          float rot = ign( gl_FragCoord.xy ) * 6.2831853;
          float occ = 0.0;
          for ( int i = 0; i < 12; i++ ) {
            float fi = ( float( i ) + 0.5 ) / 12.0;
            float a = rot + float( i ) * 2.39996323;
            vec2 suv = vUv + vec2( cos( a ), sin( a ) ) * rpx * sqrt( fi ) * px;
            vec3 S = viewPos( suv, viewZ( suv ) );
            vec3 v = S - P;
            float l2 = dot( v, v );
            float nv = dot( N, v ) * inversesqrt( l2 + 1e-4 );
            occ += max( 0.0, nv - 0.12 ) / ( 1.0 + l2 / ( R * R ) );
          }
          float ao = 1.0 - clamp( occ / 12.0 * 3.75 * uStrength, 0.0, 0.94 );
          ao = mix( ao, 1.0, smoothstep( 1200.0, 3000.0, dist ) );
          gl_FragColor = vec4( ao, ao, ao, 1.0 );
        }`,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { ...depthUniforms(), tAO: { value: null } },
      vertexShader: VERT,
      depthTest: false, depthWrite: false,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tDepth, tAO; uniform vec2 uNearFar, uRes;
        varying vec2 vUv;
        float viewZ( vec2 uv ) { return perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, uNearFar.x, uNearFar.y ); }
        void main() {
          vec2 px = 1.0 / uRes;
          float zc = viewZ( vUv );
          float sum = 0.0, wsum = 0.0;
          for ( int x = -1; x <= 1; x++ ) for ( int y = -1; y <= 1; y++ ) {
            vec2 uv = vUv + vec2( float( x ), float( y ) ) * 1.25 * px;
            float w = max( 0.0, 1.0 - abs( viewZ( uv ) - zc ) / ( 0.04 * abs( zc ) + 0.4 ) );
            sum += texture2D( tAO, uv ).r * w; wsum += w;
          }
          float ao = wsum > 0.0 ? sum / wsum : texture2D( tAO, vUv ).r;
          gl_FragColor = vec4( ao, ao, ao, 1.0 );
        }`,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tAO: { value: null }, tDepth: { value: null }, uTint: { value: new THREE.Color(0.28, 0.30, 0.45) }, uVignette: { value: 0.14 },
        uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
        uMistColor: { value: new THREE.Color(1, 1, 1) }, uMist: { value: 0.5 }, uTime: { value: 0 },
        uInk: { value: 0 }, uPx: { value: new THREE.Vector2() }, uInkEdge: { value: new THREE.Vector2(0.0004, 0.0016) }, uNight: { value: 0 },
      },
      vertexShader: VERT,
      depthTest: false, depthWrite: false,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse, tAO, tDepth; uniform vec3 uTint, uCamPos, uMistColor; uniform float uVignette, uMist, uTime;
        uniform mat4 uInvProj, uCamWorld;
        uniform float uInk, uNight; uniform vec2 uPx, uInkEdge;
        varying vec2 vUv;
        float mHash( vec2 p ) { p = fract( mod( p, 2048.0 ) * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
        float mNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( mHash( i ), mHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( mHash( i + vec2( 0.0, 1.0 ) ), mHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
        // view-space position of the depth sample at uv, and a quadrant normal from two edges out of the centre
        vec3 inkPos( vec2 uv, float d ) { vec4 v = uInvProj * vec4( uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0 ); return v.xyz / v.w; }
        vec3 inkN( vec3 a, vec3 b ) { vec3 n = cross( a, b ); float l = length( n ); return l > 1e-12 ? n / l : vec3( 0.0, 0.0, 1.0 ); }
        void main() {
          vec3 col = texture2D( tDiffuse, vUv ).rgb;
          float ao = texture2D( tAO, vUv ).r;
          col *= mix( uTint, vec3( 1.0 ), ao );
          // river mist: thin haze that pools low over the water and the banks, drifting in soft patches
          float dz = texture2D( tDepth, vUv ).x;
          float inkDist = 1e5;
          if ( dz < 0.999995 ) {
            vec4 vp = uInvProj * vec4( vUv * 2.0 - 1.0, dz * 2.0 - 1.0, 1.0 );
            vp /= vp.w;
            vec3 wp = ( uCamWorld * vp ).xyz;
            vec3 ray = wp - uCamPos;
            float dist = length( ray );
            inkDist = dist;
            // how much of the sight line runs inside the low mist layer: almost none looking straight down, a lot along the river
            const float TOP = 26.0;
            float inLayer = uCamPos.y > TOP ? ( TOP - min( wp.y, TOP ) ) / max( -ray.y / max( dist, 1e-4 ), 0.02 ) : dist * clamp( ( TOP - min( wp.y, uCamPos.y ) ) / TOP, 0.0, 1.0 );
            inLayer = min( inLayer, dist );
            float n1 = mNoise( wp.xz * 0.0018 + vec2( uTime * 0.009, uTime * 0.003 ) );
            float n2 = mNoise( wp.xz * 0.0052 - vec2( uTime * 0.005, -uTime * 0.006 ) );
            float drift = 0.42 + 0.58 * ( n1 * 0.65 + n2 * 0.35 );
            float riverBias = 1.0 - smoothstep( 0.8, 12.0, wp.y );
            float m = ( 1.0 - exp( -inLayer * 0.0022 ) ) * drift * mix( 0.70, 1.32, riverBias ) * uMist;
            col = mix( col, uMistColor, clamp( m, 0.0, 0.82 ) );
          }
          // grade: sunlit architectural maquette contrast in realistic look, warm sunlit faces against cool slate-indigo shade
          float l = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
          col = mix( vec3( l ), col, mix( 1.16, 1.05, uInk ) );
          // apply the gentle S-curve only inside [0, 1] so HDR glints (> 1) never invert channels
          vec3 base01 = clamp( col, 0.0, 1.0 );
          vec3 curved = base01 * base01 * ( 3.0 - 2.0 * base01 );
          col = col + ( curved - base01 ) * mix( 0.32, 0.22, uInk );
          col *= mix( vec3( 0.92, 0.96, 1.06 ), vec3( 1.08, 1.02, 0.91 ), smoothstep( 0.08, 0.72, l ) );
          vec2 q = vUv - 0.5;
          if ( uInk > 0.01 ) {
            // The illustrated look (Pocket City watercolor & sepia-ink): soft pigment washes, warm cream paper tooth, gentle sepia outlines.
            vec3 paper = mix( vec3( 0.94, 0.90, 0.80 ), vec3( 0.055, 0.052, 0.095 ), uNight );
            float wl = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
            // soft painterly tonal step (watercolor pooling) without harsh posterization
            float qLum = floor( wl * 7.0 + 0.5 ) / 7.0;
            vec3 wash = col * mix( 1.0, ( qLum + 0.06 ) / max( wl + 0.06, 0.06 ), 0.24 );
            wash = mix( vec3( wl ), wash, 1.14 );
            wash = mix( wash, paper, mix( 0.09, 0.05, uNight ) );
            float tooth = mNoise( gl_FragCoord.xy * 0.38 ) * 0.58 + mNoise( gl_FragCoord.xy * 0.095 + 7.0 ) * 0.42;
            wash *= 0.955 + 0.085 * tooth;
            float d0 = texture2D( tDepth, vUv ).x;
            if ( d0 >= 0.999995 ) {
              // beyond the model the sky's own wash, clouds and distant ridges stay visible through the paper tooth
              vec2 gp = abs( fract( gl_FragCoord.xy / 26.0 ) - 0.5 );
              float paperMix = mix( 0.24, 0.16, uNight );
              wash = mix( col, paper, paperMix ) * ( 0.97 + 0.055 * tooth ) * ( 1.0 - 0.045 * ( 1.0 - smoothstep( 0.03, 0.07, length( gp ) ) ) );
            }
            // Line: the depth buffer is linear across any flat face on screen, so its second difference is zero inside
            // a face and jumps at an outline or a fold. Relative to depth, one threshold serves near and far.
            float dl = texture2D( tDepth, vUv - vec2( uPx.x, 0.0 ) ).x, dr = texture2D( tDepth, vUv + vec2( uPx.x, 0.0 ) ).x;
            float dd = texture2D( tDepth, vUv - vec2( 0.0, uPx.y ) ).x, du = texture2D( tDepth, vUv + vec2( 0.0, uPx.y ) ).x;
            float nearest = min( d0, min( min( dl, dr ), min( dd, du ) ) );
            if ( d0 >= 0.999995 && nearest < 0.999995 ) inkDist = length( inkPos( vUv, nearest ) );
            float edge = ( abs( dl + dr - 2.0 * d0 ) + abs( dd + du - 2.0 * d0 ) ) / max( 1.0 - nearest, 1e-7 );
            // ...but a fold is drawn only where it is a real one. Ground, roads and yards are a heightfield and draped
            // strips whose triangles meet at a degree or two; seen low along a street, that tiny bend still steps the
            // depth slope past the threshold above, and every triangle seam came out as a long ink line. So the pen
            // also asks how far the surface turns there: normals rebuilt from the four neighbours (view space), one per
            // quadrant, and the widest angle between them. A gentle crease is let go; a kerb, a wall foot, a roof
            // ridge or an outline against what lies behind (whose quadrant normals swing round) is kept.
            vec3 p0 = inkPos( vUv, d0 );
            vec3 el = inkPos( vUv - vec2( uPx.x, 0.0 ), dl ) - p0, er = inkPos( vUv + vec2( uPx.x, 0.0 ), dr ) - p0;
            vec3 ed = inkPos( vUv - vec2( 0.0, uPx.y ), dd ) - p0, eu = inkPos( vUv + vec2( 0.0, uPx.y ), du ) - p0;
            vec3 n1 = inkN( er, eu ), n2 = inkN( eu, el ), n3 = inkN( el, ed ), n4 = inkN( ed, er );
            float turn = 1.0 - min( min( min( dot( n1, n2 ), dot( n2, n3 ) ), min( dot( n3, n4 ), dot( n4, n1 ) ) ), min( dot( n1, n3 ), dot( n2, n4 ) ) );
            // The ground (slab, hills and the streets laid on them; GROUND_A in materials.js) is a heightfield on a
            // 25 m lattice whose folds on the hills reach 25 degrees, and seen through a street (no depth) they drew as
            // triangles. Where all five samples are ground only a sharp turn (a cut face, a ridge against what lies
            // behind) is inked.
            float ga0 = texture2D( tDiffuse, vUv ).a;
            float gal = texture2D( tDiffuse, vUv - vec2( uPx.x, 0.0 ) ).a, gar = texture2D( tDiffuse, vUv + vec2( uPx.x, 0.0 ) ).a;
            float gad = texture2D( tDiffuse, vUv - vec2( 0.0, uPx.y ) ).a, gau = texture2D( tDiffuse, vUv + vec2( 0.0, uPx.y ) ).a;
            float gMin = min( ga0, min( min( gal, gar ), min( gad, gau ) ) ), gMax = max( ga0, max( max( gal, gar ), max( gad, gau ) ) );
            float ground = step( 0.9, gMin ) * ( 1.0 - step( 0.965, gMax ) );
            // 1 - cos: 0.015 is about 10 degrees, 0.06 about 20; on ground 0.3 is about 45, 0.55 about 63
            float line = smoothstep( uInkEdge.x, uInkEdge.y, edge ) * smoothstep( mix( 0.015, 0.3, ground ), mix( 0.06, 0.55, ground ), turn );
            // Trees: leaves mark themselves with zero alpha (materials.js). Blurred, that mask is the crown as one
            // shape: the pen goes round it, and inside only the big steps from clump to clump are drawn.
            float leaf = 1.0 - texture2D( tDiffuse, vUv ).a;
            for ( int i = 0; i < 8; i++ ) {
              float la = float( i ) * 0.7853982;
              leaf += 1.0 - texture2D( tDiffuse, vUv + vec2( cos( la ), sin( la ) ) * uPx * ( mod( float( i ), 2.0 ) < 0.5 ? 2.6 : 1.5 ) ).a;
            }
            leaf /= 9.0;
            float crown = smoothstep( 0.3, 0.55, leaf );
            float round = smoothstep( 0.14, 0.3, leaf ) * ( 1.0 - smoothstep( 0.4, 0.62, leaf ) );
            line = mix( line, smoothstep( uInkEdge.y * 5.0, uInkEdge.y * 12.0, edge ) * 0.7, crown );
            line = max( line, round * 0.85 );
            // the pen wavers, lifts gently on bright filigree steelwork (Trường Tiền) at medium range, and fades into watercolor haze in the distance
            line *= 0.76 + 0.24 * mNoise( gl_FragCoord.xy * 0.2 + 3.0 );
            line *= mix( 1.0, 0.36, smoothstep( 0.50, 0.82, wl ) * smoothstep( 90.0, 420.0, inkDist ) );
            line *= 1.0 - smoothstep( 320.0, 2000.0, inkDist );
            vec3 inkCol = mix( vec3( 0.24, 0.18, 0.14 ), vec3( 0.04, 0.04, 0.08 ), uNight );
            vec3 inked = mix( wash, inkCol, line * 0.70 );
            col = mix( col, inked, uInk );
          }
          col *= 1.0 - uVignette * ( 1.0 - 0.6 * uInk ) * smoothstep( 0.25, 0.85, length( q * vec2( 1.0, 0.9 ) ) );
          // one NaN or infinite pixel from the scene or grading would be smeared over the whole frame by the focus blur
          // and the bloom mips, and its NaN alpha leaves the canvas transparent; a comparison fails for NaN, so it is caught too
          if ( !all( lessThan( abs( col ), vec3( 6.0e4 ) ) ) ) col = vec3( 0.0 );
          gl_FragColor = vec4( col, 1.0 );
        }`,
    });
    // Tilt-shift focus: what lies nearer or further than the point of attention softens, which is most of what
    // makes a large scene read as a small model.
    this.focus = 800; this.aperture = 0.6;
    this.compRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
    this.dofMat = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: null }, tDepth: { value: null }, uNearFar: { value: new THREE.Vector2() }, uPx: { value: new THREE.Vector2() }, uFocus: { value: 800 }, uAperture: { value: 0.6 }, uMaxPx: { value: 8 } },
      vertexShader: VERT,
      depthTest: false, depthWrite: false,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tColor, tDepth; uniform vec2 uNearFar, uPx; uniform float uFocus, uAperture, uMaxPx;
        varying vec2 vUv;
        float dist( vec2 uv ) { return -perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, uNearFar.x, uNearFar.y ); }
        // keep a generous sharp focal band around uFocus, softening near foreground and distant background into a miniature tilt-shift
        float coc( float d ) { float k = d > uFocus ? 0.62 : 1.05; float delta = max( 0.0, abs( d - uFocus ) - uFocus * 0.18 ); return clamp( delta / max( uFocus, 1.0 ) * uAperture * k, 0.0, 1.0 ); }
        void main() {
          vec3 base = texture2D( tColor, vUv ).rgb;
          float d = dist( vUv ), c = coc( d ) * uMaxPx;
          if ( c < 0.7 ) { gl_FragColor = vec4( base, 1.0 ); return; }
          vec3 sum = base; float wsum = 1.0;
          for ( int i = 1; i < 11; i++ ) {
            float fi = float( i ), r = sqrt( fi / 11.0 ) * c, a = fi * 2.39996323;
            vec2 uv = vUv + vec2( cos( a ), sin( a ) ) * r * uPx;
            float ds = dist( uv );
            // a sharp thing in front must not smear onto the blur behind it
            float w = ( coc( ds ) * uMaxPx >= r * 0.55 || ds >= d ) ? 1.0 : 0.12;
            sum += texture2D( tColor, uv ).rgb * w; wsum += w;
          }
          gl_FragColor = vec4( sum / wsum, 1.0 );
        }`,
    });
    this.quad = new FullScreenQuad(this.aoMat);
    this.skipAO = false;
    this.whiteTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this.whiteTex.needsUpdate = true;
  }
  setSize(width: number, height: number) {
    const halfWidth = Math.max(POST_CFG.minBufferSize, Math.ceil(width / 2));
    const halfHeight = Math.max(POST_CFG.minBufferSize, Math.ceil(height / 2));
    this.aoRT.setSize(halfWidth, halfHeight);
    this.blurRT.setSize(halfWidth, halfHeight);
    this.aoMat.uniforms.uRes.value.set(halfWidth, halfHeight);
    this.blurMat.uniforms.uRes.value.set(halfWidth, halfHeight);
    this.compRT.setSize(width, height);
    this.dofMat.uniforms.uPx.value.set(1 / width, 1 / height);
    this.dofMat.uniforms.uMaxPx.value = Math.max(POST_CFG.dofMinMaxBlurPx, height / POST_CFG.dofHeightDivisor);
    const penWidthPx = Math.max(POST_CFG.penMinWidthPx, height / POST_CFG.penHeightDivisor); // ~1.5 px on screen at any density
    this.compMat.uniforms.uPx.value.set(penWidthPx / width, penWidthPx / height);
  }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    const cam = this.camera;
    if (!this.skipAO) {
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      for (const mat of [this.aoMat, this.blurMat]) {
        mat.uniforms.tDepth.value = readBuffer.depthTexture;
        mat.uniforms.uNearFar.value.set(cam.near, cam.far);
      }
      this.aoMat.uniforms.uTan.value.set(tanHalfFov * cam.aspect, tanHalfFov);
      this.aoMat.uniforms.uProjScale.value = this.aoRT.height / (2 * tanHalfFov);
      this.aoMat.uniforms.uStrength.value = this.strength;
      this.quad.material = this.aoMat;
      renderer.setRenderTarget(this.aoRT);
      this.quad.render(renderer);
      this.blurMat.uniforms.tAO.value = this.aoRT.texture;
      this.quad.material = this.blurMat;
      renderer.setRenderTarget(this.blurRT);
      this.quad.render(renderer);
    }
    const compUniforms = this.compMat.uniforms;
    compUniforms.tDiffuse.value = readBuffer.texture;
    compUniforms.tAO.value = this.skipAO ? this.whiteTex : this.blurRT.texture;
    compUniforms.tDepth.value = readBuffer.depthTexture;
    compUniforms.uInvProj.value.copy(cam.projectionMatrixInverse);
    compUniforms.uCamWorld.value.copy(cam.matrixWorld);
    compUniforms.uCamPos.value.copy(cam.position);
    this.quad.material = this.compMat;
    // Skip the full-screen focus pass when the widest circle of confusion is under the shader's 0.7 px cut-off.
    if (this.aperture * this.dofMat.uniforms.uMaxPx.value < POST_CFG.dofSkipCocPx) {
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this.quad.render(renderer);
      return;
    }
    renderer.setRenderTarget(this.compRT);
    this.quad.render(renderer);
    const dofUniforms = this.dofMat.uniforms;
    dofUniforms.tColor.value = this.compRT.texture;
    dofUniforms.tDepth.value = readBuffer.depthTexture;
    dofUniforms.uNearFar.value.set(cam.near, cam.far);
    dofUniforms.uFocus.value = this.focus;
    dofUniforms.uAperture.value = this.aperture;
    this.quad.material = this.dofMat;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() {
    this.compRT.dispose();
    this.dofMat.dispose();
    this.aoRT.dispose();
    this.blurRT.dispose();
    this.aoMat.dispose();
    this.blurMat.dispose();
    this.compMat.dispose();
    this.quad.dispose();
  }
}

// Desktop render path: scene → occlusion + grade → bloom → tone map.
export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  size.set(Math.max(POST_CFG.minBufferSize, size.x), Math.max(POST_CFG.minBufferSize, size.y)); // a hidden window can report zero
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: POST_CFG.msaaSamples,
    depthTexture: new THREE.DepthTexture(size.x, size.y),
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const occlusion = new OcclusionPass(camera);
  composer.addPass(occlusion);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(Math.max(POST_CFG.minBufferSize, size.x >> 1), Math.max(POST_CFG.minBufferSize, size.y >> 1)),
    POST_CFG.bloomInitialStrength,
    POST_CFG.bloomRadius,
    POST_CFG.bloomThreshold,
  );
  composer.addPass(bloom);
  // The canvas has an alpha channel (three always asks for one) over the page's paper colour, so the last pass
  // writes an opaque alpha: whatever went wrong upstream, the page can never show through the model.
  const output = new OutputPass();
  output.material.fragmentShader = output.material.fragmentShader.replace(/\}\s*$/, '\tgl_FragColor.a = 1.0;\n}');
  composer.addPass(output);
  // The composer multiplies by its own pixel ratio; we hand it device pixels already, so pin that to 1.
  composer.setPixelRatio(1);
  composer.setSize(size.x, size.y);
  let fast = false;
  return {
    occlusion,
    bloom,
    render: () => composer.render(),
    resize() {
      renderer.getDrawingBufferSize(size);
      const width = Math.max(POST_CFG.minBufferSize, size.x);
      const height = Math.max(POST_CFG.minBufferSize, size.y);
      composer.setSize(width, height);
      bloom.setSize(Math.max(POST_CFG.minBufferSize, width >> 1), Math.max(POST_CFG.minBufferSize, height >> 1));
    },
    setFast(on: boolean) {
      fast = !!on;
      occlusion.skipAO = fast;
      if (fast) bloom.enabled = false;
    },
    // night and rain want gentler occlusion and a touch more glow; mist takes the mood's haze colour
    setMood(glow: number, rain: number, mistColor: THREE.Color, mist: number, time: number) {
      const compUniforms = occlusion.compMat.uniforms;
      const inkValue = compUniforms.uInk.value;
      occlusion.strength = (1 - POST_CFG.aoWeatherReduction * Math.max(glow * POST_CFG.aoGlowWeight, rain)) * (1 - POST_CFG.aoInkReduction * inkValue);
      compUniforms.uNight.value = glow;
      bloom.strength = (POST_CFG.bloomBaseStrength + POST_CFG.bloomNightBoost * glow) * (1 - POST_CFG.bloomInkReduction * inkValue);
      bloom.enabled = !fast && !(inkValue > 0.5 && glow < 0.05) && bloom.strength >= POST_CFG.bloomMinEnabledStrength;
      compUniforms.uVignette.value = POST_CFG.vignetteBase + POST_CFG.vignetteNightBoost * glow;
      compUniforms.uMistColor.value.copy(mistColor);
      compUniforms.uMist.value = mist;
      compUniforms.uTime.value = time;
    },
    setFocus(distance: number, aperture: number) { occlusion.focus = distance; occlusion.aperture = fast ? 0 : aperture; },
    setLook(ink: number) { occlusion.compMat.uniforms.uInk.value = ink; },
  };
}
