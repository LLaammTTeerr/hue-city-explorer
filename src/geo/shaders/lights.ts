import * as THREE from 'three';

// Bounded premultiplied night-lighting shaders: architectural strips and jewel-like lamp halos that never
// stack into blinding white HDR fireballs when overlapping, while preserving post.ts's destination alpha mask.
export function createLightMaterials(shared) {
  function lightMaterial(color = 0xffffff, boost = 1.0) {
  return new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uColor: { value: new THREE.Color(color) }, uBoost: { value: boost } },
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `
      uniform vec3 uColor; uniform float uGlow, uBoost;
      void main() {
        float g = clamp( uGlow, 0.0, 1.0 );
        vec3 raw = uColor * min( uBoost, 1.45 ) * 0.88;
        vec3 c = raw / ( 1.0 + max( raw.r, max( raw.g, raw.b ) ) * 0.32 );
        float a = clamp( g * 0.92, 0.0, 0.92 );
        gl_FragColor = vec4( c * a, a );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    depthWrite: false,
    transparent: true,
  });
}

// Soft bounded light points (street lamps, bridge lamps). Premultiplied alpha-over caps any number of
// overlapping halos smoothly at their true warm hue instead of blowing out to white.
  function glowPoints(positions, colors, size = 9) {
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
        float px = uSize * 1.08 * uScale / max( 1.0, -mv.z );
        float nearCalm = 1.0 / ( 1.0 + max( 0.0, px - 18.0 ) * 0.065 );
        vFade = clamp( px / 2.1, 0.28, 0.95 ) * nearCalm;
        gl_PointSize = clamp( px, 2.6, 32.0 );
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vFade; uniform float uGlow, uBoost; uniform vec3 uTint;
      void main() {
        float d = length( gl_PointCoord - 0.5 ) * 2.0;
        if ( d >= 1.0 ) discard;
        float falloff = pow( max( 0.0, 1.0 - d ), 2.15 ) * 0.74 + smoothstep( 0.36, 0.0, d ) * 0.26;
        float w = clamp( falloff * clamp( uGlow, 0.0, 1.0 ) * min( uBoost, 1.30 ) * vFade, 0.0, 0.88 );
        vec3 base = vCol * uTint;
        base = base / ( 1.0 + max( base.r, max( base.g, base.b ) ) * 0.22 );
        gl_FragColor = vec4( base * w * 1.02, w * 0.86 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
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
  return { lightMaterial, glowPoints };
}
