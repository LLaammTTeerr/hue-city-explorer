import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { NOISE } from './sky.js';
import { quality, POND_Y } from '../config.js';
import { pondY } from '../geo/terrain.js';
import { Buf } from '../geo/buf.js';

// One sheet of river water under the slab; the land is cut out around the real banks. Lakes, ponds and the
// moat get their own, higher sheet (no mirror pass: they are small and mostly seen from above).
// Desktop gets a planar reflection (the bridge, its lights, the sky); phones get an analytic sky reflection.
export function buildWater(data) {
  const shader = {
    name: 'HueWater',
    uniforms: {
      color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
      uTime: { value: 0 }, uRain: { value: 0 }, uReflect: { value: quality.reflection ? 1 : 0 }, uGlow: { value: 0 }, uLook: { value: 0 },
      uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() },
      uSkyTop: { value: new THREE.Color() }, uSkyHorizon: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uSunDisk: { value: 1 },
      uFog: { value: new THREE.Color() }, uFogDensity: { value: 0.0001 },
      // the downstream current: river coordinates (along, across, tangent*weight) on a coarse grid; off on ponds
      tFlow: { value: null }, uFlowBox: { value: new THREE.Vector4(0, 0, 1, 1) }, uFlowSize: { value: new THREE.Vector2(1, 1) },
      uFlowOn: { value: 0 }, uCurrent: { value: 0.85 },
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
      uniform highp sampler2D tFlow;
      uniform float uTime, uRain, uReflect, uSunDisk, uFogDensity, uGlow, uFlowOn, uCurrent, uLook;
      uniform vec3 uDeep, uShallow, uSkyTop, uSkyHorizon, uSunDir, uSunCol, uFog;
      uniform vec4 uFlowBox; uniform vec2 uFlowSize;
      varying vec4 vUvR; varying vec3 vW;
      ${NOISE}
      // value noise with its analytic gradient (x: value, yz: d/dp); an integer hash keeps it exact far from the origin
      float hashu( vec2 i ) {
        uvec2 q = uvec2( ivec2( i ) ) * uvec2( 1597334673u, 3812015801u );
        uint n = ( q.x ^ q.y ) * 1597334673u;
        return float( n >> 8 ) * ( 1.0 / 16777216.0 );
      }
      vec3 vnoised( vec2 p ) {
        vec2 i = floor( p ), f = fract( p );
        vec2 u = f * f * ( 3.0 - 2.0 * f ), du = 6.0 * f * ( 1.0 - f );
        float a = hashu( i ), b = hashu( i + vec2( 1.0, 0.0 ) ), c = hashu( i + vec2( 0.0, 1.0 ) ), d = hashu( i + vec2( 1.0, 1.0 ) );
        float k1 = b - a, k2 = c - a, k4 = a - b - c + d;
        return vec3( a + k1 * u.x + k2 * u.y + k4 * u.x * u.y, du * vec2( k1 + k4 * u.y, k2 + k4 * u.x ) );
      }
      // one octave of frequency f drifting at vel (m/s), turned by the rotation r; height and gradient in q
      vec3 oct( vec2 q, float f, vec2 vel, mat2 r, float a ) {
        vec3 n = vnoised( r * ( q - vel * uTime ) * f );
        return vec3( n.x, ( n.yz * r ) * f ) * a;
      }
      // swell (three broad octaves) plus two crisp wavelet octaves crossing at angles, faded out by the size of a
      // pixel (fw) so far water stays calm and never shimmers. cur is the downstream drift along q.x.
      vec3 waves( vec2 q, float cur, float fw, float near, out float crest ) {
        const mat2 I = mat2( 1.0, 0.0, 0.0, 1.0 );
        const mat2 R1 = mat2( 0.7648, 0.6442, -0.6442, 0.7648 ), R2 = mat2( 0.3624, -0.9320, 0.9320, 0.3624 ), R3 = mat2( 0.9211, -0.3894, 0.3894, 0.9211 );
        vec3 h = oct( q, 0.035, vec2( cur - 1.4, -0.8 ), I, 1.1 )
               + oct( q, 0.11, vec2( cur + 0.75, -0.55 ), R3, 0.5 )
               + oct( q, 0.37, vec2( cur * 1.1 + 0.55, -0.45 ), R1, 0.2 ) * ( 1.0 - smoothstep( 0.25, 0.7, fw * 0.37 ) );
        crest = 0.0;
        float k1 = ( 1.0 - smoothstep( 0.18, 0.5, fw * 0.95 ) ) * near;
        if ( k1 > 0.001 ) {
          vec3 w1 = oct( q, 0.95, vec2( cur * 1.15 - 0.3, 0.42 ), R1, 0.075 * k1 );
          float k2 = ( 1.0 - smoothstep( 0.18, 0.5, fw * 2.1 ) ) * near;
          vec3 w2 = k2 > 0.001 ? oct( q, 2.1, vec2( cur * 1.2 + 0.35, -0.3 ), R2, 0.032 * k2 ) : vec3( 0.0 );
          h += w1 + w2;
          crest = ( w1.x / ( 0.075 * k1 ) + ( k2 > 0.001 ? w2.x / ( 0.032 * k2 ) : 0.5 ) - 1.0 ) * k1;
        }
        return h;
      }
      // the river frame at p: along-stream s, across d (xy), and how much of the river frame applies (z); t: tangent
      vec4 flowAt( vec2 p, out vec2 t ) {
        vec2 g = ( p - uFlowBox.xy ) * uFlowBox.zw - 0.5;
        vec2 i = floor( g ), f = g - i;
        ivec2 mx = ivec2( uFlowSize ) - 1;
        ivec2 i0 = clamp( ivec2( i ), ivec2( 0 ), mx ), i1 = clamp( ivec2( i ) + 1, ivec2( 0 ), mx );
        vec4 a = texelFetch( tFlow, i0, 0 ), b = texelFetch( tFlow, ivec2( i1.x, i0.y ), 0 );
        vec4 c = texelFetch( tFlow, ivec2( i0.x, i1.y ), 0 ), d = texelFetch( tFlow, i1, 0 );
        vec4 v = mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y );
        float w = length( v.zw );
        t = w > 1e-4 ? v.zw / w : vec2( 1.0, 0.0 );
        return vec4( v.xy, clamp( w, 0.0, 1.0 ), 0.0 );
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
        float fw = length( fwidth( p ) ); // metres covered by one pixel here
        float near = smoothstep( 520.0, 60.0, dist );
        vec2 t = vec2( 1.0, 0.0 );
        vec4 fl = uFlowOn > 0.5 ? flowAt( p, t ) : vec4( 0.0 );
        float wf = fl.z;
        vec3 hw = vec3( 0.0 ), hr = vec3( 0.0 );
        float crestW = 0.0, crestR = 0.0;
        if ( wf < 0.995 ) hw = waves( p, 0.0, fw, near, crestW );
        if ( wf > 0.005 ) {
          hr = waves( fl.xy, uCurrent, fw, near, crestR );
          hr.yz = hr.y * t + hr.z * vec2( -t.y, t.x ); // back from the river frame to world x/z
        }
        vec3 hh = mix( hw, hr, wf );
        float crest = mix( crestW, crestR, wf );
        vec2 g = hh.yz;
        float amp = mix( 1.28, 2.1, uRain ) * lod;
        float rip = 0.0;
        if ( uRain > 0.01 ) {
          float nearR = smoothstep( 420.0, 40.0, dist );
          rip = ( rings( p, 1.6, 0.0 ) + rings( p, 2.7, 13.7 ) + rings( p + 40.0, 4.4, 31.1 ) ) * nearR * uRain;
        }
        vec3 n = normalize( vec3( -g.x * amp, 1.0, -g.y * amp ) );
        float ndv = clamp( dot( n, V ), 0.0, 1.0 ); // pow( 1.0 - ndv ) below is NaN past 1
        float fres = clamp( 0.07 + 0.93 * pow( 1.0 - ndv, 3.2 ), 0.0, 1.0 );

        vec3 R = reflect( -V, n );
        vec3 sky = mix( uSkyHorizon, uSkyTop, pow( clamp( R.y * 1.6, 0.0, 1.0 ), 0.5 ) );
        vec3 refl = sky;
        if ( uReflect > 0.5 ) {
          // the mirror is pushed about more along the line of sight than across it, so lights on the far bank
          // break up into vertical streaks the way they do on real water
          vec2 fwd = normalize( -V.xz + 1e-5 ), side = vec2( -fwd.y, fwd.x );
          vec2 dn = vec2( dot( n.xz, side ) * 0.75, dot( n.xz, fwd ) * 1.7 );
          vec4 uv = vUvR;
          uv.xy += dn * ( 0.085 + uRain * 0.06 ) * uv.w * ( 0.35 + 0.65 * lod );
          refl = texture2DProj( tDiffuse, uv ).rgb;
          // bright reflections (lamps, LEDs) gather on the wavelet crests and fade softly with distance so night streaks stay silky
          float lum = dot( refl, vec3( 0.299, 0.587, 0.114 ) );
          float distAtten = mix( 1.0, smoothstep( 1050.0, 140.0, dist ), uGlow );
          refl *= 1.0 + smoothstep( 0.48, 1.15, lum ) * clamp( crest, -0.7, 1.0 ) * 0.65 * distAtten;
        }
        float tone = vnoise( p * 0.004 + 3.0 );
        vec3 body = mix( uDeep, uShallow, clamp( ndv * ndv * 0.55 + tone * 0.35, 0.0, 1.0 ) );
        vec3 col = mix( body, refl, fres * mix( 0.74, 0.7, uRain ) ); // the river keeps some of its own jade under the sky it mirrors

        // sun path: a broad path of light, broken by the wavelets into sharp glints close by
        float sd = max( dot( R, uSunDir ), 0.0 );
        float spark = pow( sd, 1400.0 ) * 9.0 * near * ( 1.0 - uRain );
        col += uSunCol * ( pow( sd, 220.0 ) * 2.1 + pow( sd, 30.0 ) * 0.07 + spark ) * uSunDisk;

        // rain: pale rings close by, a flatter, milkier surface further off
        col += mix( uFog, vec3( 1.0 ), 0.4 ) * rip * 0.45;
        col = mix( col, uFog, uRain * 0.16 );

        if ( uLook > 0.5 ) {
          // drawn water: calm watercolor jade wash with soft mirrored sky/bridges and fine elongated pen-and-wash strokes
          float washTone = vnoise( p * 0.009 + 1.7 ) * 0.65 + vnoise( p * 0.032 - 2.3 ) * 0.35;
          vec3 washW = mix( uShallow, uDeep, 0.25 + 0.35 * washTone ) * mix( 1.08, 0.96, uGlow );
          float reflW = mix( 0.48, 0.62, uGlow ) * fres;
          vec3 drawn = mix( washW, refl, reflW );
          // fine directional ripple strokes stretched across the line of sight instead of round foam blobs
          // The stroke frame is the camera's heading, one for the whole frame. It used to be each pixel's own view ray
          // (V), but p is a world position hundreds of metres from the origin, so the slightest turn of V from pixel to
          // pixel swept the noise coordinate by whole cells: the strokes lined up on curves of constant dot( p, V ) and
          // came out as rings of broken arcs round the middle of the view. Forward plus up keeps the heading defined
          // when the camera looks straight down (forward is then vertical, and up points along the heading).
          vec3 camFwd = -vec3( viewMatrix[ 0 ][ 2 ], viewMatrix[ 1 ][ 2 ], viewMatrix[ 2 ][ 2 ] );
          vec3 camUp = vec3( viewMatrix[ 0 ][ 1 ], viewMatrix[ 1 ][ 1 ], viewMatrix[ 2 ][ 1 ] );
          vec2 viewFwd = normalize( camFwd.xz + camUp.xz + 1e-5 );
          vec2 viewSide = vec2( -viewFwd.y, viewFwd.x );
          vec2 sp = vec2( dot( p, viewSide ) * 0.085, dot( p, viewFwd ) * 0.45 - uTime * 0.24 );
          float streakN = vnoise( sp ) * 0.65 + vnoise( sp * vec2( 2.1, 2.4 ) + 5.1 ) * 0.35;
          float fineStroke = smoothstep( 0.72, 0.88, streakN ) * ( 0.45 + 0.55 * clamp( crest + 0.3, 0.0, 1.0 ) ) * near * ( 1.0 - uRain * 0.55 );
          vec3 strokeCol = mix( mix( uSkyHorizon, vec3( 1.0 ), 0.42 ), uSunCol * 0.95, 0.35 * uSunDisk );
          drawn = mix( drawn, strokeCol, fineStroke * mix( 0.34, 0.18, uGlow ) );
          drawn += uSunCol * ( pow( sd, 48.0 ) * 0.28 + pow( sd, 12.0 ) * 0.08 ) * uSunDisk * ( 1.0 - uRain );
          drawn += mix( uFog, vec3( 1.0 ), 0.45 ) * rip * 0.6;
          drawn = mix( drawn, uFog, uRain * 0.14 );
          col = drawn;
        }
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
    const scale = 0.35;
    const rtW = (w, r) => Math.max(2, Math.min(960, Math.round(w * r * scale)));
    const rtH = (h, r) => Math.max(2, Math.min(540, Math.round(h * r * scale)));
    mesh = new Reflector(geo, {
      shader,
      textureWidth: rtW(innerWidth, quality.pixelRatio),
      textureHeight: rtH(innerHeight, quality.pixelRatio),
      clipBias: 0.02,
      multisample: 0,
    });
    // Refresh the distorted water reflection every 3rd frame when moving, and skip when the camera is still
    // during daytime (ripples still animate in the fragment shader). Adaptive quality can also turn it off.
    const renderMirror = mesh.onBeforeRender;
    let tick = 0, enabled = true, hasFrame = false;
    const lastPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    const lastQuat = new THREE.Quaternion();
    mesh.userData.invalidate = () => { tick = 0; hasFrame = false; };
    mesh.userData.setReflection = (on) => {
      enabled = !!on;
      mesh.material.uniforms.uReflect.value = enabled ? 1 : 0;
      if (enabled) { tick = 0; hasFrame = false; }
    };
    mesh.userData.resize = (w, h, pr = quality.pixelRatio) => {
      const r = typeof pr === 'object' && pr && typeof pr.getPixelRatio === 'function' ? pr.getPixelRatio() : pr;
      mesh.getRenderTarget().setSize(rtW(w, r), rtH(h, r));
      tick = 0;
      hasFrame = false;
    };
    mesh.onBeforeRender = function (...args) {
      if (!enabled) return;
      const cam = args[2];
      const moved = !hasFrame || cam.position.distanceToSquared(lastPos) > 0.04 || Math.abs(cam.quaternion.dot(lastQuat)) < 0.999999;
      const night = mesh.material.uniforms.uGlow.value > 0.05;
      if (!moved && !night) return;
      if (!hasFrame || tick++ % 3 === 0) {
        lastPos.copy(cam.position);
        lastQuat.copy(cam.quaternion);
        hasFrame = true;
        mesh.getReflectionCamera(cam).layers.set(0);
        renderMirror.apply(this, args);
      }
    };
  } else {
    const u = THREE.UniformsUtils.clone(shader.uniforms);
    u.textureMatrix.value = new THREE.Matrix4();
    mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ ...shader, uniforms: u }));
    mesh.userData.resize = () => {};
    mesh.userData.invalidate = () => {};
    mesh.userData.setReflection = () => {};
  }
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((b[0] + b[2]) / 2, 0, (b[1] + b[3]) / 2);
  mesh.name = 'water';
  mesh.frustumCulled = false;

  // still water
  const P = new Buf(4096);
  (data.ponds || []).forEach((poly, pi) => {
    const Y = pondY(data, pi);
    const rings = poly.map((r) => { const o = []; for (let i = 0; i < r.length; i += 2) o.push(new THREE.Vector2(r[i] / 10, r[i + 1] / 10)); return o; });
    let faces;
    try { faces = THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1)); } catch { return; }
    const pts = rings[0].concat(...rings.slice(1));
    for (const f of faces) P.tri([pts[f[0]].x, Y, pts[f[0]].y], [pts[f[1]].x, Y, pts[f[1]].y], [pts[f[2]].x, Y, pts[f[2]].y], [1, 1, 1], [0, 1, 0]);
  });
  const pu = THREE.UniformsUtils.clone(shader.uniforms);
  pu.textureMatrix.value = new THREE.Matrix4();
  pu.uReflect.value = 0;
  const ponds = new THREE.Mesh(P.geometry(), new THREE.ShaderMaterial({ ...shader, uniforms: pu }));
  ponds.name = 'ponds';
  ponds.frustumCulled = false;

  // the river sheet drifts downstream; the ponds keep their flow switched off
  const flow = buildFlow(data, b);
  if (flow) {
    const u = mesh.material.uniforms;
    u.tFlow.value = flow.tex;
    u.uFlowBox.value.copy(flow.box);
    u.uFlowSize.value.copy(flow.size);
    u.uFlowOn.value = 1;
  }
  return { mesh, ponds, uniforms: mesh.material.uniforms, sets: [mesh.material.uniforms, pu] };
}

// River coordinates on a coarse grid: for each cell, the distance along the (smoothed) centre line from its upstream
// end (s), the signed distance across it (d) and its unit tangent times a weight. Waves drawn in (s, d) and slid
// along s move downstream at one speed everywhere, so the pattern never stretches the way an advected one does.
// The weight falls to zero away from the river and where the frame folds (the inside of tight bends), and the
// shader goes back to plain world coordinates there.
function buildFlow(data, b, step = 40) {
  const r = data.river;
  if (!r || r.length < 4) return null;
  let P = [];
  for (let i = 0; i < r.length; i += 2) P.push([r[i] / 10, r[i + 1] / 10]);
  // run the ends on straight, so cells past either end still get a sensible frame
  const ext = (a, c) => { const dx = a[0] - c[0], dz = a[1] - c[1], l = Math.hypot(dx, dz) || 1; return [a[0] + (dx / l) * 3000, a[1] + (dz / l) * 3000]; };
  P = [ext(P[0], P[1]), ...P, ext(P[P.length - 1], P[P.length - 2])];
  const coarse = P;
  // resample every 25 m, then smooth with a wide Gaussian: the frame needn't hug the centre line, it only has to
  // bend gently enough (radius well over the river's half-width) that it never folds over the water
  {
    const R = [P[0]];
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], c = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 25));
      for (let k = 1; k <= n; k++) R.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
    }
    const sig = 10, K = [];
    for (let k = -3 * sig; k <= 3 * sig; k++) K.push(Math.exp(-(k * k) / (2 * sig * sig)));
    P = R.map((_, i) => {
      let x = 0, z = 0, ws = 0;
      K.forEach((kw, k) => { const q = R[Math.min(R.length - 1, Math.max(0, i + k - 3 * sig))]; x += q[0] * kw; z += q[1] * kw; ws += kw; });
      return [x / ws, z / ws];
    });
  }
  const S = [0];
  for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const mid = S[S.length - 1] / 2; // centred, to keep the numbers small in the shader
  const BAND0 = 430, BAND1 = 640;
  const nx = Math.ceil((b[2] - b[0]) / step) + 1, nz = Math.ceil((b[3] - b[1]) / step) + 1;
  const sv = new Float32Array(nx * nz), dv = new Float32Array(nx * nz), tx = new Float32Array(nx * nz), tz = new Float32Array(nx * nz), w = new Float32Array(nx * nz);
  const segD2 = (x, z, a, c) => {
    const ex = c[0] - a[0], ez = c[1] - a[1], l2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
    const px = a[0] + ex * t - x, pz = a[1] + ez * t - z;
    return [px * px + pz * pz, t];
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = b[0] + (i + 0.5) * step, z = b[1] + (j + 0.5) * step;
    let near = Infinity;
    for (let k = 0; k + 1 < coarse.length; k++) near = Math.min(near, segD2(x, z, coarse[k], coarse[k + 1])[0]);
    if (near > (BAND1 + 250) ** 2) continue;
    let best = Infinity, bk = 0, bt = 0;
    for (let k = 0; k + 1 < P.length; k++) { const [d2, t] = segD2(x, z, P[k], P[k + 1]); if (d2 < best) { best = d2; bk = k; bt = t; } }
    const a = P[bk], c = P[bk + 1], ex = c[0] - a[0], ez = c[1] - a[1], l = Math.hypot(ex, ez) || 1;
    const ux = ex / l, uz = ez / l;
    const o = j * nx + i;
    sv[o] = S[bk] + bt * l - mid;
    dv[o] = (x - a[0]) * -uz + (z - a[1]) * ux; // across, positive to the left of the stream (normal = (-tz, tx))
    tx[o] = ux; tz[o] = uz;
    const ad = Math.abs(dv[o]);
    w[o] = ad <= BAND0 ? 1 : ad >= BAND1 ? 0 : 1 - (ad - BAND0) / (BAND1 - BAND0);
  }
  // where neighbouring cells disagree about s, the frame folds over: drop the river frame there and next to it
  const fold = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const o = j * nx + i;
    if (!w[o]) continue;
    if ((i + 1 < nx && w[o + 1] && Math.abs(sv[o + 1] - sv[o]) > step * 2.2) || (j + 1 < nz && w[o + nx] && Math.abs(sv[o + nx] - sv[o]) > step * 2.2)) { fold[o] = 1; if (i + 1 < nx) fold[o + 1] = 1; if (j + 1 < nz) fold[o + nx] = 1; }
  }
  const W = new Float32Array(w);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let f = 0;
    for (let dj = -1; dj <= 1 && !f; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < nz && fold[jj * nx + ii]) { f = 1; break; } }
    if (f) W[j * nx + i] = 0;
  }
  // soften the weight so the hand-over is gradual
  const data4 = new Float32Array(nx * nz * 4);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    let sum = 0, n = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < nz) { sum += W[jj * nx + ii]; n++; } }
    const o = j * nx + i, ww = W[o] ? sum / n : 0;
    data4[o * 4] = sv[o]; data4[o * 4 + 1] = dv[o]; data4[o * 4 + 2] = tx[o] * ww; data4[o * 4 + 3] = tz[o] * ww;
  }
  const tex = new THREE.DataTexture(data4, nx, nz, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter; // filtered by hand in the shader (float filtering isn't everywhere)
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return { tex, box: new THREE.Vector4(b[0], b[1], 1 / step, 1 / step), size: new THREE.Vector2(nx, nz) };
}
