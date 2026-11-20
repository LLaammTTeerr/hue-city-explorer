import * as THREE from 'three';
import { Buf, hex, unflat } from '../geo/buf.js';
import { cityMaterial, lightMaterial, shared } from '../geo/materials.js';
import { quality } from '../config.js';

// A smooth hull lofted through stations along x (local +x is the bow): each station's section runs from the keel
// up a rounded bilge to the sheer. bands: [t, colour] rows up the side (t 0 keel … 1 sheer); the deck closes it.
function loftHull(B, { x0, x1, n, w, sheer, keel, bands, deck, deckY }) {
  const P = (x, t, sd) => {
    const a = (t * Math.PI) / 2, wx = w(x);
    return [x, keel(x) + (sheer(x) - keel(x)) * (1 - Math.cos(a)), sd * wx * Math.pow(Math.sin(a), 0.7)];
  };
  const N = (x, t, sd) => { // outward normal by differences across and along the hull
    const e = 1e-3, pt = P(x, Math.min(1, t + e), sd), pt2 = P(x, Math.max(0, t - e), sd), px = P(x + e, t, sd), px2 = P(x - e, t, sd);
    const u = [pt[0] - pt2[0], pt[1] - pt2[1], pt[2] - pt2[2]], v = [px[0] - px2[0], px[1] - px2[1], px[2] - px2[2]];
    let c = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (c[2] * sd + (t < 0.3 ? -c[1] : 0) < 0) c = c.map((q) => -q);
    if (!(Math.hypot(...c) > 1e-9)) c = [0, -1, 0];
    return c;
  };
  const xs = [];
  for (let i = 0; i <= n; i++) { const u = i / n; xs.push(x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos(u * Math.PI))); } // denser at the ends
  for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
    const xa = xs[i], xb = xs[i + 1];
    for (let k = 0; k + 1 < bands.length; k++) {
      const ta = bands[k][0], tb = bands[k + 1][0], col = bands[k][1], C = [col, col, col];
      const a = P(xa, ta, sd), b = P(xb, ta, sd), c = P(xb, tb, sd), d = P(xa, tb, sd);
      const na = N(xa, ta, sd), nb = N(xb, ta, sd), nc = N(xb, tb, sd), nd = N(xa, tb, sd);
      if (sd > 0) { B.smoothTri([a, b, c], [na, nb, nc], C); B.smoothTri([a, c, d], [na, nc, nd], C); }
      else { B.smoothTri([a, c, b], [na, nc, nb], C); B.smoothTri([a, d, c], [na, nd, nc], C); }
    }
  }
  // deck, a little below the sheer, as a strip across each pair of stations
  const up = [0, 1, 0];
  for (let i = 0; i < n; i++) {
    const xa = xs[i], xb = xs[i + 1], wa = w(xa) * 0.97, wb = w(xb) * 0.97, ya = deckY(xa), yb = deckY(xb);
    B.quad([xa, ya, -wa], [xb, yb, -wb], [xb, yb, wb], [xa, ya, wa], deck, up);
  }
}

// Thuyền rồng — the dragon boats that work the Hương. Local +x is the bow.
function dragonBoatGeometry() {
  const B = new Buf(900);
  const yellow = hex('#e8b530'), red = hex('#b8322a'), green = hex('#2f7d5c'), wood = hex('#7a5136'), cream = hex('#efe2c2');
  const woodD = hex('#5e3e2a'), white = hex('#f4efe2'), dark = hex('#1d1a17');
  const lo = quality.low;
  // a long, fine hull: full amidships, drawn in to a sharp stem under the dragon and a rounded transom; the sheer
  // sweeps up at both ends
  loftHull(B, {
    x0: -10.2, x1: 10.4, n: lo ? 8 : 14,
    w: (x) => { const u = x >= 0.5 ? (x - 0.5) / 9.9 : (0.5 - x) / 10.7; return Math.max(0.06, 2.12 * Math.pow(Math.max(0, 1 - Math.pow(u, x >= 0.5 ? 2.2 : 3.2)), 0.55)); },
    sheer: (x) => 0.98 + 0.28 * Math.pow(Math.abs(x) / 10.3, 3),
    keel: (x) => -0.42 + 0.5 * Math.pow(Math.abs(x) / 10.4, 4),
    bands: lo ? [[0, woodD], [0.45, wood], [0.86, red], [1, red]] : [[0, woodD], [0.3, wood], [0.62, wood], [0.86, red], [1, red]],
    deck: hex('#a98a64'),
    deckY: (x) => 0.9 + 0.22 * Math.pow(Math.abs(x) / 10.3, 3),
  });
  // cabin and roof
  B.box(-2.6, 0, 0.95, 2.75, 10.4, 3.3, 0, cream, { top: red });
  for (let x = -7.2; x <= 2.2; x += 1.9) B.box(x, 0, 0.95, 2.75, 0.24, 3.42, 0, red);
  B.hip(-2.6, 0, 11.6, 3.9, 0, 2.75, 0.95, yellow, { flare: 0.28, over: 0.2, ridgeCol: red });
  B.box(-2.6, 0, 3.3, 3.75, 4.4, 1.7, 0, green);
  B.hip(-2.6, 0, 5.2, 2.3, 0, 3.75, 0.6, yellow, { flare: 0.2 });
  // dragon: arched neck and head at the bow, tail at the stern
  B.beam([8.0, 0.95, 0], [9.5, 1.5, 0], 0.46, 0.5, yellow);
  B.beam([9.5, 1.5, 0], [10.3, 2.3, 0], 0.4, 0.44, yellow);
  B.beam([10.3, 2.3, 0], [11.5, 2.2, 0], 0.5, 0.42, red);
  B.beam([11.5, 2.2, 0], [12.0, 2.0, 0], 0.34, 0.26, yellow);
  B.beam([10.5, 2.5, 0.16], [9.9, 3.0, 0.34], 0.08, 0.08, yellow);
  B.beam([10.5, 2.5, -0.16], [9.9, 3.0, -0.34], 0.08, 0.08, yellow);
  for (let i = 0; i < 3; i++) B.beam([8.4 + i * 0.6, 1.3 + i * 0.3, 0], [8.5 + i * 0.6, 1.75 + i * 0.3, 0], 0.07, 0.3, green);
  // open lower jaw, eyes and a beard, so the head reads as a dragon rather than a post
  B.beam([10.4, 1.95, 0], [11.7, 1.72, 0], 0.36, 0.16, red);
  for (const sd of [-1, 1]) {
    B.box(10.75, sd * 0.24, 2.36, 2.56, 0.18, 0.08, 0, white);
    B.box(10.8, sd * 0.285, 2.4, 2.52, 0.08, 0.03, 0, dark);
  }
  B.beam([10.2, 1.85, 0], [10.0, 1.35, 0], 0.18, 0.12, green);
  B.beam([-9.4, 0.9, 0], [-11.0, 2.3, 0], 0.44, 0.44, yellow);
  B.beam([-11.0, 2.3, 0], [-11.5, 3.3, 0], 0.3, 0.3, red);
  return B.geometry();
}

// Projects pts onto arc length for constant-speed travel along the mapped river centre line.
function makeTrack(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc[acc.length - 1];
  return {
    total,
    at(s) {
      s = Math.max(0, Math.min(total, s));
      let i = 1;
      while (i < acc.length - 1 && acc[i] < s) i++;
      const a = pts[i - 1], b = pts[i];
      const t = (s - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      return { x: a[0] + dx * t, z: a[1] + dz * t, tx: dx / l, tz: dz / l };
    },
  };
}

// Traffic keeps to the stretch between Cồn Dã Viên and the head of Cồn Hến.
function riverTrack(data) {
  if (!data || !Array.isArray(data.river) || data.river.length < 6) return null;
  const pts = unflat(data.river).filter((p) => p[0] > -2300 && p[0] < 700 && p[1] > -700 && p[1] < 1500);
  return pts.length > 2 ? makeTrack(pts) : null;
}

// A small sampan with a woven arched roof, the kind tied up along the banks. Local +x is the bow.
function sampanGeometry() {
  const B = new Buf(160);
  const wood = hex('#5f4433'), deck = hex('#8a6a4c'), mat = hex('#b89a6a'), matD = hex('#9a7f55');
  loftHull(B, {
    x0: -4.2, x1: 4.4, n: quality.low ? 5 : 7,
    w: (x) => { const u = x >= 0 ? x / 4.4 : -x / 4.2; return Math.max(0.05, 0.9 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 0.6)); },
    sheer: (x) => 0.45 + 0.22 * Math.pow(Math.abs(x) / 4.3, 2.5),
    keel: (x) => -0.25 + 0.3 * Math.pow(Math.abs(x) / 4.3, 3),
    bands: [[0, wood], [0.55, wood], [1, wood]],
    deck,
    deckY: (x) => 0.4 + 0.18 * Math.pow(Math.abs(x) / 4.3, 2.5),
  });
  // arched roof in five facets
  const x0 = -2.2, x1 = 1.2, r = 0.95;
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI, a1 = ((i + 1) / 5) * Math.PI;
    const p0 = [Math.cos(a0) * r, 0.45 + Math.sin(a0) * r * 0.95], p1 = [Math.cos(a1) * r, 0.45 + Math.sin(a1) * r * 0.95];
    B.quad([x0, p0[1], p0[0]], [x1, p0[1], p0[0]], [x1, p1[1], p1[0]], [x0, p1[1], p1[0]], i % 2 ? mat : matD, [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)]);
  }
  return B.geometry();
}

// Night lights on a dragon boat, in the boat's local space (see dragonBoatGeometry for the surfaces).
// Real: the thuyền rồng that take visitors out after dark glow from their cabin windows and hang strings of
// lanterns under the eaves and at the dragon's head. Illustrative: the number and spacing of lanterns.
// Two meshes per boat at most: the window band (one colour) and every lantern (amber and red as vertex colour).
function boatLightGeometry() {
  const W = new Buf(48), L = new Buf(400);
  const one = [1, 1, 1];
  // window band on both long sides of the cabin (cabin x −7.8…2.6, z ±1.65), skipping the red posts
  const posts = [];
  for (let x = -7.2; x <= 2.2; x += 1.9) posts.push(x);
  const edges = [-7.7, ...posts.flatMap((x) => [x - 0.14, x + 0.14]), 2.5];
  for (let i = 0; i + 1 < edges.length; i += 2) {
    const x0 = edges[i], x1 = edges[i + 1];
    if (x1 - x0 < 0.2) continue;
    for (const sd of [-1, 1]) {
      const z = sd * 1.71;
      W.quad([x0, 1.55, z], [x1, 1.55, z], [x1, 2.38, z], [x0, 2.38, z], one, [0, 0, sd]);
    }
  }
  // a pane at each end of the cabin
  for (const [x, sd] of [[2.66, 1], [-7.86, -1]]) W.quad([x, 1.55, -0.9], [x, 1.55, 0.9], [x, 2.38, 0.9], [x, 2.38, -0.9], one, [sd, 0, 0]);

  const amber = hex('#ffb347'), red = hex('#e84a3c');
  let k = 0;
  const lantern = (x, y, z, s = 1) => { L.box(x, z, y - 0.2 * s, y + 0.2 * s, 0.3 * s, 0.3 * s, 0, k++ % 2 ? red : amber, { bottom: true }); };
  // under the lower roof's eave (eave half-width 2.15 at y ≈ 2.75, cabin wall at 1.65)
  const step = quality.low ? 2.4 : 1.2;
  for (const sd of [-1, 1]) { k = sd > 0 ? 0 : 1; for (let x = -8.0; x <= 2.9; x += step) lantern(x, 2.48, sd * 1.98); }
  lantern(3.25, 2.55, 0); lantern(-8.45, 2.55, 0);
  // the upper roof's four corners
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lantern(-2.6 + sx * 2.75, 3.5, sz * 1.3, 0.85);
  // at the dragon: a pair at the jaw, one hung at the tail
  k = 1; lantern(10.9, 1.85, 0.42, 0.9); k = 1; lantern(10.9, 1.85, -0.42, 0.9);
  k = 0; lantern(-10.9, 1.75, 0, 0.9);
  return { windows: W.geometry(), lanterns: L.geometry() };
}

// Additive light coloured per vertex (Buf stores colours square-rooted), scaled by the night glow like lightMaterial.
function vertexLightMaterial(boost) {
  return new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uBoost: { value: boost } },
    vertexShader: 'attribute vec3 color; varying vec3 vCol; void main() { vCol = color * color; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `
      varying vec3 vCol; uniform float uGlow, uBoost;
      void main() {
        gl_FragColor = vec4( vCol * uBoost * uGlow, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
}

// A V-wake behind a moving boat: the two Kelvin arms (about 19.5° each side of the track, stationary relative to the
// boat), faint transverse bands between them and churned water behind the stern, with foam that stays put in the
// water while the boat moves on. One flat strip per boat on layer 1, so the river's mirror pass never draws it.
const WAKE_HALF = Math.tan((19.5 * Math.PI) / 180) * 1.05;
function wakeGeometry(bow, len, segs) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const d = (len * i * i) / (segs * segs) + (len / segs) * 0.15 * i * (1 - i / segs); // finer near the bow
    const hw = 1.5 + d * WAKE_HALF * 1.2;
    for (const v of [-1, 1]) { pos.push(bow - d, 0, v * hw); uv.push(d, v); }
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const WAKE_FRAG = /* glsl */ `
  varying vec2 vD; // metres behind the bow, side (-1…1)
  uniform float uTime, uGlow, uAmt, uSpd, uLen, uRun, uStern;
  float h1( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
  float vn( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( h1( i ), h1( i + vec2( 1, 0 ) ), f.x ), mix( h1( i + vec2( 0, 1 ) ), h1( i + vec2( 1, 1 ) ), f.x ), f.y ); }
  void main() {
    float d = vD.x;
    float hw = 1.5 + d * ${WAKE_HALF.toFixed(4)} * 1.2;
    float y = vD.y * hw, a = abs( vD.y );
    // foam fixed in the water: the pattern slides back past the boat at its own speed
    vec2 q = vec2( d + uRun, y );
    float foam = vn( q * vec2( 0.9, 1.3 ) ) * 0.6 + vn( q * vec2( 2.3, 3.1 ) + 7.0 ) * 0.4;
    // the arms: crests that sit along each line, broken into chevrons
    float edge = 1.0 / 1.2;
    float arm = exp( -pow( ( a - edge ) / ( 0.07 + 0.05 * smoothstep( 0.0, uLen, d ) ), 2.0 ) );
    float chev = 0.68 + 0.32 * sin( ( d * 0.95 - abs( y ) * 0.55 ) * 1.6 + foam * 2.4 );
    // transverse waves between the arms, one wavelength 2πv²/g apart
    float lam = max( 3.0, 6.283 * uSpd * uSpd / 9.81 );
    float trans = ( 0.5 + 0.5 * cos( 6.283 * d / lam ) ) * smoothstep( edge, 0.2, a ) * 0.22;
    // churn behind the stern, spreading as it goes
    float sw = 1.3 + 0.07 * max( 0.0, d - uStern );
    float wash = exp( -pow( y / sw, 2.0 ) ) * smoothstep( uStern - 3.0, uStern + 4.0, d ) * ( 0.35 + 0.65 * foam );
    float fade = smoothstep( 0.0, 2.5, d ) * exp( -d / ( uLen * 0.42 ) ) * smoothstep( uLen, uLen * 0.6, d );
    float k = ( arm * chev * ( 0.5 + 0.5 * foam ) * 0.95 + wash * 0.75 + trans ) * fade * uAmt;
    // silver by day, catching the warm lantern light at night
    vec3 tint = mix( vec3( 0.86, 0.91, 0.93 ), vec3( 1.0, 0.78, 0.46 ), uGlow ) * mix( 1.0, 0.42, uGlow );
    gl_FragColor = vec4( tint, clamp( k, 0.0, 0.8 ) );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function makeWake(group, time, { bow = 9.8, stern = 20.5, len = 110 } = {}) {
  const geo = wakeGeometry(bow, len, quality.low ? 10 : 18);
  const uniforms = { uTime: time, uGlow: shared.uGlow, uAmt: { value: 0 }, uSpd: { value: 0 }, uLen: { value: len }, uRun: { value: 0 }, uStern: { value: stern } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vD; void main() { vD = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: WAKE_FRAG,
    transparent: true,
    depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.layers.set(1);
  mesh.renderOrder = 2;
  mesh.raycast = () => {};
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.name = 'wake';
  group.add(mesh);
  const last = new THREE.Vector3(), cur = new THREE.Vector3();
  let has = false, spd = 0;
  // follow a boat: its heading, its speed measured from how far it moved (works for boats moved elsewhere too)
  return (boat, dt) => {
    if (!boat.visible) { mesh.visible = false; has = false; return; }
    cur.copy(boat.position);
    if (has && dt > 1e-4) {
      const v = Math.hypot(cur.x - last.x, cur.z - last.z) / dt;
      if (v < 40) spd += (v - spd) * Math.min(1, dt * 2.5); // a jump (a teleport, a new ride) is not speed
    } else spd = 0;
    last.copy(cur); has = true;
    const amt = Math.min(1, Math.max(0, (spd - 0.4) / 4.0));
    mesh.visible = amt > 0.01;
    if (!mesh.visible) return;
    mesh.position.set(cur.x, 0.05, cur.z);
    mesh.rotation.set(0, boat.rotation.y, 0);
    uniforms.uAmt.value = amt;
    uniforms.uSpd.value = Math.min(spd, 9);
    uniforms.uLen.value = len * Math.min(1.3, 0.45 + spd / 8);
    uniforms.uRun.value += spd * dt;
    if (uniforms.uRun.value > 4096) uniforms.uRun.value -= 4096;
  };
}

export function buildBoats(data, group) {
  const geo = dragonBoatGeometry();
  const mat = cityMaterial();
  // lights: geometry and materials built once and shared by every boat
  let lights = null;
  try {
    const g = boatLightGeometry();
    const winMat = lightMaterial(0xffc66b, 1.35);
    winMat.polygonOffset = true; winMat.polygonOffsetFactor = -2; winMat.polygonOffsetUnits = -2;
    lights = { ...g, winMat, lanMat: vertexLightMaterial(1.5) };
  } catch (e) { lights = null; }
  const light = (m) => {
    if (!lights) return;
    const w = new THREE.Mesh(lights.windows, lights.winMat), l = new THREE.Mesh(lights.lanterns, lights.lanMat);
    for (const c of [w, l]) { c.renderOrder = 19; c.raycast = () => {}; m.add(c); }
  };
  // sampans at the moorings
  const mo = data.moorings || [];
  if (mo.length) {
    const im = new THREE.InstancedMesh(sampanGeometry(), mat, mo.length / 3);
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ss = new THREE.Vector3(), pp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < mo.length / 3; i++) {
      const k = 0.85 + ((i * 37) % 10) / 25;
      qq.setFromAxisAngle(up, -mo[i * 3 + 2] / 1000 + (i % 2 ? Math.PI : 0));
      pp.set(mo[i * 3] / 10, 0, mo[i * 3 + 1] / 10); ss.set(k, k, k);
      im.setMatrixAt(i, m4.compose(pp, qq, ss));
    }
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true;
    im.frustumCulled = false;
    group.add(im);
  }
  const make = () => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; light(m); group.add(m); return m; };

  const track = riverTrack(data);
  const fleet = [];
  if (track) {
    const n = 5;
    for (let i = 0; i < n; i++) fleet.push({ mesh: make(), s: (track.total * (i + 0.5)) / n, dir: i % 2 ? 1 : -1, speed: 3.2 + (i % 3) * 0.9, lane: 26 + (i % 3) * 16, phase: i * 1.7 });
  }
  const rideBoat = make();
  rideBoat.visible = false;

  // wakes: one per boat, fleet and the ride boat alike
  const wakeTime = { value: 0 };
  let wakes = [];
  try { wakes = [...fleet.map((b) => [b.mesh, makeWake(group, wakeTime)]), [rideBoat, makeWake(group, wakeTime)]]; } catch (e) { wakes = []; }

  return {
    rideBoat,
    fleet,
    update(dt, time) {
      for (const b of fleet) {
        b.s += b.dir * b.speed * dt;
        if (b.s > track.total - 5) { b.s = track.total - 5; b.dir = -1; }
        if (b.s < 5) { b.s = 5; b.dir = 1; }
        const p = track.at(b.s);
        const tx = p.tx * b.dir, tz = p.tz * b.dir;
        // keep right
        b.mesh.position.set(p.x - tz * b.lane, Math.sin(time * 0.9 + b.phase) * 0.06, p.z + tx * b.lane);
        b.mesh.rotation.set(Math.sin(time * 0.7 + b.phase) * 0.012, Math.atan2(-tz, tx), 0);
      }
      wakeTime.value = Number.isFinite(time) ? time : 0;
      const d = Number.isFinite(dt) ? Math.min(0.25, Math.max(0, dt)) : 0;
      for (const [m, follow] of wakes) follow(m, d);
    },
  };
}

// Hoa đăng — paper lotus lanterns with a candle inside, set on the Hương in front of the Citadel.
// Real: on festival nights (rằm tháng Bảy, Festival Huế, Phật Đản) people float đèn hoa đăng down this stretch
// between Nghênh Lương Đình and cầu Trường Tiền. Illustrative: how many, where the clusters are, their size
// (drawn about twice life size so they read from the air), the drift speed.
// Two draw calls: the instanced lotus cups (geometry, so the river mirrors them) and a soft halo point for each.
function lotusGeometry() {
  const pos = [], lum = [];
  const v = (x, y, z, l) => { pos.push(x, y, z); lum.push(l); };
  // six petals splayed out from a small base ring
  const n = 6, r0 = 0.16, r1 = 0.46;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    v(Math.cos(a0) * r0, 0.04, Math.sin(a0) * r0, 0.45);
    v(Math.cos(am) * r1, 0.26, Math.sin(am) * r1, 1.0);
    v(Math.cos(a1) * r0, 0.04, Math.sin(a1) * r0, 0.45);
  }
  // the flame: two crossed diamonds
  for (const [cx, cz] of [[1, 0], [0, 1]]) {
    const w = 0.07;
    v(-cx * w, 0.2, -cz * w, 1.6); v(cx * w, 0.2, cz * w, 1.6); v(0, 0.48, 0, 0.9);
    v(cx * w, 0.2, cz * w, 1.6); v(-cx * w, 0.2, -cz * w, 1.6); v(0, 0.1, 0, 1.2);
  }
  return { pos: new Float32Array(pos), lum: new Float32Array(lum) };
}

const LANTERN_VERT_COMMON = /* glsl */ `
  attribute vec4 aOff; // x, z, yaw, scale
  attribute vec3 aCol;
  attribute float aPhase;
  uniform float uTime;
  varying vec3 vCol;
  vec3 lanternPos( vec3 p ) {
    float c = cos( aOff.z ), s = sin( aOff.z );
    p = vec3( c * p.x - s * p.z, p.y, s * p.x + c * p.z ) * aOff.w;
    return p + vec3( aOff.x, 0.03 + 0.025 * sin( uTime * 1.3 + aPhase * 1.7 ), aOff.y );
  }
  float flicker() { return 0.85 + 0.15 * sin( uTime * 2.2 + aPhase ); }
`;
const LANTERN_FRAG_END = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

export function buildLanterns(data, group) {
  const none = { update() {} };
  try {
    return makeLanterns(data, group) || none;
  } catch (e) {
    console.warn('hoa đăng skipped:', e);
    return none;
  }
}

function inRing(x, z, r) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], zi = r[i][1], xj = r[j][0], zj = r[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

// Dry land: inside a land polygon and outside its holes. Without land data nothing is land.
function landTest(data) {
  const polys = [];
  for (const poly of data.land || []) {
    if (!Array.isArray(poly) || !Array.isArray(poly[0]) || poly[0].length < 6) continue;
    const rings = poly.map(unflat);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of rings[0]) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    polys.push({ rings, x0, x1, z0, z1 });
  }
  return (x, z) => {
    for (const p of polys) {
      if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
      if (inRing(x, z, p.rings[0]) && !p.rings.slice(1).some((h) => inRing(x, z, h))) return true;
    }
    return false;
  };
}

function makeLanterns(data, group) {
  const track = riverTrack(data);
  if (!track) return null;
  const STEP = 2; // metres between samples of the centre line
  const nearestS = (x, z) => {
    let best = 0, bd = Infinity;
    for (let s = 0; s <= track.total; s += STEP) { const p = track.at(s); const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = s; } }
    return best;
  };
  const place = (id) => { const p = (data.places || []).find((q) => q && q.id === id); return p && Number.isFinite(p.x) && Number.isFinite(p.z) ? [p.x / 10, p.z / 10] : null; };
  const ng = place('nghenhluong');
  const tt = data.truongtien && data.truongtien.box && data.truongtien.box.c ? [data.truongtien.box.c[0] / 10, data.truongtien.box.c[1] / 10] : place('truongtien') || place('ndchieu');
  if (!ng || !tt) return null;
  // from just upstream of Nghênh Lương Đình to just short of the bridge piers (cutwaters reach ~8 m either side)
  const s0 = Math.max(0, nearestS(ng[0], ng[1]) - 30), s1 = Math.min(track.total, nearestS(tt[0], tt[1]) - 14);
  const len = s1 - s0;
  if (!(len > 100)) return null;

  // free water either side of the centre line (lateral + = the south bank, see buildBoats' lanes)
  const isLand = landTest(data);
  const onLand = (p, o) => isLand(p.x - p.tz * o, p.z + p.tx * o);
  const reach = (p, sd) => {
    let o = 0;
    while (o < 400 && !onLand(p, sd * (o + 8))) o += 8;
    while (o < 400 && !onLand(p, sd * (o + 1))) o += 1;
    return o;
  };
  const coarse = [];
  for (let s = s0; s <= s1 + 20; s += 20) {
    const p = track.at(s);
    coarse.push(onLand(p, 0) ? null : [-reach(p, -1), reach(p, 1)]);
  }
  const ns = Math.floor(len / STEP) + 2;
  const tab = new Float32Array(ns * 6); // x, z, tx, tz, mid, half
  for (let i = 0; i < ns; i++) {
    const s = s0 + i * STEP, p = track.at(s);
    const f = (s - s0) / 20, j = Math.min(coarse.length - 2, Math.floor(f)), t = Math.min(1, f - j);
    const a = coarse[j], b = coarse[j + 1] || a;
    let mid = 0, half = 0;
    if (a && b) {
      const lo = a[0] + (b[0] - a[0]) * t, hi = a[1] + (b[1] - a[1]) * t;
      const margin = Math.max(18, (hi - lo) * 0.14); // well inside the water
      if (hi - lo > margin * 2 + 4) { mid = (lo + hi) / 2; half = (hi - lo) / 2 - margin; }
    }
    tab.set([p.x, p.z, p.tx, p.tz, mid, half], i * 6);
  }

  // clusters strung out along the current, mostly mid-channel and toward the south bank
  let seed = 0x5eed1a7;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.15;
  const N = quality.low ? 60 : 160;
  const S = new Float32Array(N), V = new Float32Array(N), F = new Float32Array(N), A = new Float32Array(N), Wv = new Float32Array(N), P = new Float32Array(N), K = new Float32Array(N);
  const off = new Float32Array(N * 4), col = new Float32Array(N * 3), phase = new Float32Array(N);
  const palette = [new THREE.Color('#ffb84d'), new THREE.Color('#ff9668'), new THREE.Color('#f28ab2')];
  let i = 0;
  while (i < N) {
    const size = Math.min(N - i, 3 + Math.floor(rnd() * 14));
    const cs = rnd() * len, cf = -0.35 + 1.1 * Math.pow(rnd(), 0.75), cv = 0.25 + rnd() * 0.15, spread = 0.03 + rnd() * 0.05;
    for (let m = 0; m < size; m++, i++) {
      S[i] = cs - Math.log(1 - rnd() * 0.97) * 14 + gauss() * 5; // a tail trailing upstream
      S[i] = ((S[i] % len) + len) % len;
      V[i] = Math.max(0.24, Math.min(0.41, cv + gauss() * 0.012));
      F[i] = Math.max(-0.5, Math.min(0.85, cf + gauss() * spread));
      A[i] = 0.015 + rnd() * 0.03; // lateral wander, as a share of the half-width
      Wv[i] = (0.03 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1);
      P[i] = rnd() * Math.PI * 2;
      K[i] = 0.85 + rnd() * 0.35;
      const r = rnd(), c = palette[r < 0.68 ? 0 : r < 0.92 ? 1 : 2];
      col.set([c.r, c.g, c.b], i * 3);
      phase[i] = P[i];
    }
  }

  const aOff = new THREE.InstancedBufferAttribute(off, 4).setUsage(THREE.DynamicDrawUsage);
  const aCol = new THREE.InstancedBufferAttribute(col, 3), aPhase = new THREE.InstancedBufferAttribute(phase, 1);
  const uTime = { value: 0 };
  const shape = lotusGeometry();
  const bodyGeo = new THREE.InstancedBufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(shape.pos, 3));
  bodyGeo.setAttribute('aLum', new THREE.BufferAttribute(shape.lum, 1));
  bodyGeo.setAttribute('aOff', aOff); bodyGeo.setAttribute('aCol', aCol); bodyGeo.setAttribute('aPhase', aPhase);
  bodyGeo.instanceCount = N;
  const bodyMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: shared.uGlow, uTime, uBoost: { value: 1.25 } },
    vertexShader: LANTERN_VERT_COMMON + `
      attribute float aLum;
      void main() {
        vCol = aCol * aLum * flicker();
        gl_Position = projectionMatrix * modelViewMatrix * vec4( lanternPos( position ), 1.0 );
      }`,
    fragmentShader: `
      varying vec3 vCol; uniform float uGlow, uBoost;
      void main() {
        gl_FragColor = vec4( vCol * uBoost * uGlow, 1.0 );` + LANTERN_FRAG_END + '}',
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.frustumCulled = false;
  body.renderOrder = 19;
  body.raycast = () => {};

  // halo: one point per lantern from the same instance data
  const haloGeo = new THREE.InstancedBufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.22, 0]), 3));
  haloGeo.setAttribute('aOff', aOff); haloGeo.setAttribute('aCol', aCol); haloGeo.setAttribute('aPhase', aPhase);
  haloGeo.instanceCount = N;
  const haloMat = new THREE.ShaderMaterial({
    // uScale: pixels per unit of size at distance 1; main.js may set it to its pxScale, otherwise it is estimated
    uniforms: { uGlow: shared.uGlow, uTime, uSize: { value: 2.6 }, uScale: { value: 0 }, uBoost: { value: 0.75 } },
    vertexShader: LANTERN_VERT_COMMON + `
      uniform float uSize, uScale; varying float vFade;
      void main() {
        vCol = aCol * flicker();
        vec4 mv = modelViewMatrix * vec4( lanternPos( position ), 1.0 );
        gl_Position = projectionMatrix * mv;
        float sc = uScale > 0.0 ? uScale : projectionMatrix[1][1] * 450.0;
        float px = uSize * aOff.w * sc / max( 1.0, -mv.z );
        vFade = clamp( px / 2.4, 0.12, 1.0 ) * step( 0.01, aOff.w );
        gl_PointSize = clamp( px, 2.0, 64.0 );
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vFade; uniform float uGlow, uBoost;
      void main() {
        float d = length( gl_PointCoord - 0.5 ) * 2.0;
        float a = pow( max( 0.0, 1.0 - d ), 2.4 );
        gl_FragColor = vec4( vCol * a * uGlow * uBoost * vFade, 1.0 );` + LANTERN_FRAG_END + '}',
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const halo = new THREE.Points(haloGeo, haloMat);
  halo.frustumCulled = false;
  halo.renderOrder = 20;
  halo.raycast = () => {};

  const root = new THREE.Group();
  root.name = 'hoa-dang';
  root.add(body, halo);
  group.add(root);

  const place1 = (k, time) => {
    const u = S[k] / STEP, j = Math.min(ns - 2, Math.floor(u)), t = u - j, a = j * 6, b = a + 6;
    const x = tab[a] + (tab[b] - tab[a]) * t, z = tab[a + 1] + (tab[b + 1] - tab[a + 1]) * t;
    const tx = tab[a + 2] + (tab[b + 2] - tab[a + 2]) * t, tz = tab[a + 3] + (tab[b + 3] - tab[a + 3]) * t;
    const mid = tab[a + 4] + (tab[b + 4] - tab[a + 4]) * t, half = tab[a + 5] + (tab[b + 5] - tab[a + 5]) * t;
    const f = F[k] + A[k] * Math.sin(time * 0.09 + P[k] * 3.1) + A[k] * 0.5 * Math.sin(time * 0.23 + P[k]);
    const lat = mid + f * half;
    // fade in and out at the two ends of the stretch so the wrap does not pop; nothing where the water is too narrow
    const edge = Math.min(1, S[k] / 25, (len - S[k]) / 25);
    const o = k * 4;
    off[o] = x - tz * lat;
    off[o + 1] = z + tx * lat;
    off[o + 2] = P[k] + time * Wv[k];
    off[o + 3] = tab[a + 5] > 0 && tab[b + 5] > 0 ? K[k] * Math.max(0, edge) : 0;
  };
  for (let k = 0; k < N; k++) place1(k, 0);
  aOff.needsUpdate = true;

  return {
    group: root,
    halo, // halo.material.uniforms.uScale can take main.js's pxScale
    update(dt, time) {
      if (!(shared.uGlow.value >= 0.01)) { root.visible = false; return; }
      root.visible = true;
      const d = Math.min(Number.isFinite(dt) ? Math.max(0, dt) : 0, 0.25);
      const tm = Number.isFinite(time) ? time : 0;
      uTime.value = tm;
      for (let k = 0; k < N; k++) {
        S[k] += V[k] * d;
        if (S[k] >= len) S[k] -= len;
        place1(k, tm);
      }
      aOff.needsUpdate = true;
    },
  };
}
