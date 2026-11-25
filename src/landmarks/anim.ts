import * as THREE from 'three';
import { shared } from '../geo/materials.ts';

// Moving parts for the places, animated on the GPU from the city's shared clock and wind (`shared` in
// geo/materials.js, which mood.js writes every frame). A place adds one to its dynamic group and is done: it needs no
// update() of its own, and every flag in the city streams the same way the trees lean and the rain slants.
//
//   flag(group, { at: [x, y, z], w, h, look, landmark })
//     at    the top of the hoist (where the flag meets the pole), in world metres
//     w, h  the flag's size in metres
//     look  'vn' (red field, yellow star), a colour [r, g, b] in linear floats (as geo/buf.js hex() gives), or a
//           function (ctx, W, H) that paints a 192 × 128 canvas
//   The geometry is built at its real size, so the wave is in metres, not undone by a scale.

// down-wind in the xz plane: the same direction as the foliage wind in geo/materials.js
const WX = 0.78, WZ = -0.42, WL = Math.hypot(WX, WZ);
export const WIND_DIR = [WX / WL, WZ / WL];
const WIND_YAW = Math.atan2(-WIND_DIR[1], WIND_DIR[0]); // rotation.y that points a mesh's +x down-wind

// x along the fly (0 at the hoist), y up; s = x / w. Two travelling waves growing toward the fly, plus a little flutter;
// the fly end droops a little in a light wind. dz/dx and dz/dy give the bent normal so the folds catch the light.
const WAVE = /* glsl */ `
  float s = clamp( position.x / uSize.x, 0.0, 1.0 );
  float k1 = 6.2832 * 1.15 / uSize.x, k2 = 6.2832 * 2.3 / uSize.x, ky = 6.2832 * 0.35 / uSize.y;
  float ph1 = position.x * k1 - uTime * 4.0 * ( 0.7 + 0.3 * uWind ) + uPhase;
  float ph2 = position.x * k2 - uTime * 6.3 + position.y * ky + uPhase * 1.7;
  float amp = uSize.x * ( 0.045 + 0.035 * uWind );
  float flap = sin( ph1 ) + 0.45 * sin( ph2 );
  float dz = amp * s * flap;
  float dzdx = amp * ( flap / uSize.x + s * ( k1 * cos( ph1 ) + 0.45 * k2 * cos( ph2 ) ) );
  float dzdy = amp * s * 0.45 * ky * cos( ph2 );
`;

let vnMap = null;
function vnTexture() {
  if (vnMap) return vnMap;
  vnMap = paint((g, W, H) => {
    g.fillStyle = '#da251d'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffdf00';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 15.5 : 40, t = -Math.PI / 2 + (i * Math.PI) / 5;
      g[i ? 'lineTo' : 'moveTo'](96 + Math.cos(t) * r, 67 + Math.sin(t) * r);
    }
    g.closePath(); g.fill();
  });
  return vnMap;
}

function paint(draw) {
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 128;
  draw(cv.getContext('2d'), 192, 128);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let seq = 0;
export function flag(group, { at, w, h, look = 'vn' as any, landmark, yaw = WIND_YAW }: Record<string, any>) {
  const geo = new THREE.PlaneGeometry(w, h, 16, 6);
  geo.translate(w / 2, -h / 2, 0); // hoist edge on x = 0, top edge on y = 0
  const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
  if (look === 'vn') mat.map = vnTexture();
  else if (typeof look === 'function') mat.map = paint(look);
  else mat.color.setRGB(look[0], look[1], look[2]);
  const uni = { uSize: { value: new THREE.Vector2(w, h) }, uPhase: { value: (seq++ * 2.39996) % 6.2832 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni, { uTime: shared.uTime, uWind: shared.uWind });
    sh.vertexShader = 'uniform float uTime; uniform float uWind; uniform vec2 uSize; uniform float uPhase;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `${WAVE}
  vec3 objectNormal = normalize( vec3( -dzdx, -dzdy, 1.0 ) );
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3( tangent.xyz );
  #endif`)
      .replace('#include <begin_vertex>', `vec3 transformed = position;
  transformed.z += dz;
  transformed.x -= abs( dz ) * 0.25 * s; // the cloth is pulled in a little where it folds
  transformed.y -= s * s * uSize.y * 0.06 * ( 1.6 - uWind );`);
  };
  mat.customProgramCacheKey = () => 'hue-flag';
  const m = new THREE.Mesh(geo, mat);
  m.position.set(at[0], at[1], at[2]);
  m.rotation.y = yaw;
  m.frustumCulled = false; // the wave moves it outside the plane's bounds
  if (landmark) m.userData.landmark = landmark;
  group.add(m);
  return m;
}
