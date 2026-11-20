import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;

// Ambient occlusion from the depth buffer alone (normals are rebuilt from depth, which suits
// flat-faced buildings), blurred with respect to depth, then multiplied in with a cool tint.
// The same pass applies a light grade and vignette.
class OcclusionPass extends Pass {
  constructor(camera) {
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
          vec3 N = normalize( cross( dx, dy ) );
          float dist = -z;
          // world radius grows with distance: door-step shadows up close, street-canyon shading from the air
          float R = clamp( dist * 0.022, 1.6, 34.0 );
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
            occ += max( 0.0, nv - 0.14 ) / ( 1.0 + l2 / ( R * R ) );
          }
          float ao = 1.0 - clamp( occ / 12.0 * 2.9 * uStrength, 0.0, 0.92 );
          ao = mix( ao, 1.0, smoothstep( 2600.0, 6500.0, dist ) );
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
          for ( int x = -2; x <= 1; x++ ) for ( int y = -2; y <= 1; y++ ) {
            vec2 uv = vUv + ( vec2( float( x ), float( y ) ) + 0.5 ) * px;
            float w = max( 0.0, 1.0 - abs( viewZ( uv ) - zc ) / ( 0.04 * abs( zc ) + 0.4 ) );
            sum += texture2D( tAO, uv ).r * w; wsum += w;
          }
          float ao = wsum > 0.0 ? sum / wsum : texture2D( tAO, vUv ).r;
          gl_FragColor = vec4( ao, ao, ao, 1.0 );
        }`,
    });
    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tAO: { value: null }, tDepth: { value: null }, uTint: { value: new THREE.Color(0.34, 0.31, 0.44) }, uVignette: { value: 0.15 },
        uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
        uMistColor: { value: new THREE.Color(1, 1, 1) }, uMist: { value: 0.5 }, uTime: { value: 0 },
      },
      vertexShader: VERT,
      depthTest: false, depthWrite: false,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse, tAO, tDepth; uniform vec3 uTint, uCamPos, uMistColor; uniform float uVignette, uMist, uTime;
        uniform mat4 uInvProj, uCamWorld;
        varying vec2 vUv;
        float mHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
        float mNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
          return mix( mix( mHash( i ), mHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( mHash( i + vec2( 0.0, 1.0 ) ), mHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
        void main() {
          vec3 col = texture2D( tDiffuse, vUv ).rgb;
          float ao = texture2D( tAO, vUv ).r;
          col *= mix( uTint, vec3( 1.0 ), ao );
          // river mist: thin haze that pools low over the water and the banks, drifting in soft patches
          float dz = texture2D( tDepth, vUv ).x;
          if ( dz < 0.999995 ) {
            vec4 vp = uInvProj * vec4( vUv * 2.0 - 1.0, dz * 2.0 - 1.0, 1.0 );
            vp /= vp.w;
            vec3 wp = ( uCamWorld * vp ).xyz;
            vec3 ray = wp - uCamPos;
            float dist = length( ray );
            // how much of the sight line runs inside the low mist layer: almost none looking straight down, a lot along the river
            const float TOP = 30.0;
            float inLayer = uCamPos.y > TOP ? ( TOP - min( wp.y, TOP ) ) / max( -ray.y / dist, 0.02 ) : dist * clamp( ( TOP - min( wp.y, uCamPos.y ) ) / TOP, 0.0, 1.0 );
            inLayer = min( inLayer, dist );
            float drift = 0.55 + 0.45 * mNoise( wp.xz * 0.0019 + vec2( uTime * 0.008, uTime * 0.003 ) );
            float m = ( 1.0 - exp( -inLayer * 0.0021 ) ) * drift * uMist;
            col = mix( col, uMistColor, clamp( m, 0.0, 0.82 ) );
          }
          // grade: a little more separation, warm highlights against dusty-plum Huế shade
          float l = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
          // grade toward old paper and patina: warm lights, subtle plum-slate shade
          col = mix( vec3( l ), col, 1.05 );
          // apply the gentle S-curve only inside [0, 1] so HDR glints (> 1) never invert channels
          vec3 base01 = clamp( col, 0.0, 1.0 );
          vec3 curved = base01 * base01 * ( 3.0 - 2.0 * base01 );
          col = col + ( curved - base01 ) * 0.22;
          col *= mix( vec3( 0.96, 0.96, 1.02 ), vec3( 1.06, 1.0, 0.92 ), smoothstep( 0.06, 0.72, l ) );
          vec2 q = vUv - 0.5;
          col *= 1.0 - uVignette * smoothstep( 0.25, 0.85, length( q * vec2( 1.0, 0.9 ) ) );
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
        // keep foreground miniature softening while easing far-field blur so distant hills read as misty ridges
        float coc( float d ) { float k = d > uFocus ? 0.58 : 1.0; return clamp( abs( d - uFocus ) / max( uFocus, 1.0 ) * uAperture * k, 0.0, 1.0 ); }
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
  }
  setSize(w, h) {
    const hw = Math.max(2, Math.ceil(w / 2)), hh = Math.max(2, Math.ceil(h / 2));
    this.aoRT.setSize(hw, hh);
    this.blurRT.setSize(hw, hh);
    this.aoMat.uniforms.uRes.value.set(hw, hh);
    this.blurMat.uniforms.uRes.value.set(hw, hh);
    this.compRT.setSize(w, h);
    this.dofMat.uniforms.uPx.value.set(1 / w, 1 / h);
    this.dofMat.uniforms.uMaxPx.value = Math.max(4, h / 130);
  }
  render(renderer, writeBuffer, readBuffer) {
    const cam = this.camera;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    for (const m of [this.aoMat, this.blurMat]) {
      m.uniforms.tDepth.value = readBuffer.depthTexture;
      m.uniforms.uNearFar.value.set(cam.near, cam.far);
    }
    this.aoMat.uniforms.uTan.value.set(tan * cam.aspect, tan);
    this.aoMat.uniforms.uProjScale.value = this.aoRT.height / (2 * tan);
    this.aoMat.uniforms.uStrength.value = this.strength;
    this.quad.material = this.aoMat;
    renderer.setRenderTarget(this.aoRT);
    this.quad.render(renderer);
    this.blurMat.uniforms.tAO.value = this.aoRT.texture;
    this.quad.material = this.blurMat;
    renderer.setRenderTarget(this.blurRT);
    this.quad.render(renderer);
    const cu = this.compMat.uniforms;
    cu.tDiffuse.value = readBuffer.texture;
    cu.tAO.value = this.blurRT.texture;
    cu.tDepth.value = readBuffer.depthTexture;
    cu.uInvProj.value.copy(cam.projectionMatrixInverse);
    cu.uCamWorld.value.copy(cam.matrixWorld);
    cu.uCamPos.value.copy(cam.position);
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.compRT);
    this.quad.render(renderer);
    const du = this.dofMat.uniforms;
    du.tColor.value = this.compRT.texture;
    du.tDepth.value = readBuffer.depthTexture;
    du.uNearFar.value.set(cam.near, cam.far);
    du.uFocus.value = this.focus;
    du.uAperture.value = this.aperture;
    this.quad.material = this.dofMat;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.compRT.dispose(); this.dofMat.dispose(); this.aoRT.dispose(); this.blurRT.dispose(); this.aoMat.dispose(); this.blurMat.dispose(); this.compMat.dispose(); this.quad.dispose(); }
}

// Desktop render path: scene → occlusion + grade → bloom → tone map.
export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  size.set(Math.max(2, size.x), Math.max(2, size.y)); // a hidden window can report zero
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(size.x, size.y) });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const occlusion = new OcclusionPass(camera);
  composer.addPass(occlusion);
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.32, 0.55, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // The composer multiplies by its own pixel ratio; we hand it device pixels already, so pin that to 1.
  composer.setPixelRatio(1);
  composer.setSize(size.x, size.y);
  return {
    occlusion, bloom,
    render: () => composer.render(),
    resize() { renderer.getDrawingBufferSize(size); composer.setPixelRatio(1); composer.setSize(Math.max(2, size.x), Math.max(2, size.y)); },
    // night and rain want gentler occlusion and a touch more glow; mist takes the mood's haze colour
    setMood(glow, rain, mistColor, mist, time) {
      occlusion.strength = 1 - 0.35 * Math.max(glow * 0.6, rain);
      bloom.strength = 0.3 + 0.3 * glow;
      const u = occlusion.compMat.uniforms;
      u.uVignette.value = 0.15 + 0.15 * glow;
      u.uMistColor.value.copy(mistColor);
      u.uMist.value = mist;
      u.uTime.value = time;
    },
    setFocus(distance, aperture) { occlusion.focus = distance; occlusion.aperture = aperture; },
  };
}
