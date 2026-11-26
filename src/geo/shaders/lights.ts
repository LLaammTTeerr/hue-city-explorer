import * as THREE from 'three';

// Additive night-lighting shaders: glowing architectural strips and distance-clamped lamp halos.
export function createLightMaterials(shared) {
// Architectural lighting: strips of light laid along a structure. Geometry, so the river mirrors them; they
// follow the mood's glow and vanish by day. `boost` above 1 pushes them into the bloom.
  function lightMaterial(color = 0xffffff, boost = 1.6) {
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
        float px = uSize * uScale / max( 1.0, -mv.z );
        float nearCalm = 1.0 / ( 1.0 + max( 0.0, px - 18.0 ) * 0.065 );
        vFade = clamp( px / 2.6, 0.16, 1.0 ) * nearCalm;
        gl_PointSize = clamp( px, 2.6, 36.0 );
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
  return { lightMaterial, glowPoints };
}
