import * as THREE from 'three';
import { Buf, hex, unflat } from '../geo/buf.js';
import { cityMaterial, lightMaterial, shared } from '../geo/materials.js';
import { quality } from '../config.js';

// Thuyền rồng — the dragon boats that work the Hương. Local +x is the bow.
function dragonBoatGeometry() {
  const B = new Buf(400);
  const yellow = hex('#e8b530'), red = hex('#b8322a'), green = hex('#2f7d5c'), wood = hex('#7a5136'), cream = hex('#efe2c2');
  const hull = [[-10, -1.6], [-7.5, -2.1], [6, -2.1], [10.2, 0], [6, 2.1], [-7.5, 2.1], [-10, 1.6]];
  B.prism(hull, -0.4, 0.95, wood, hex('#a98a64'), { scaleTop: 1.04 });
  B.prism(hull.map(([x, z]) => [x * 0.99, z * 1.06]), 0.75, 1.0, red, red, { top: false });
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
  const B = new Buf(64);
  const wood = hex('#5f4433'), deck = hex('#8a6a4c'), mat = hex('#b89a6a'), matD = hex('#9a7f55');
  const hull = [[-4.2, 0], [-3, -0.85], [2.6, -0.85], [4.4, 0], [2.6, 0.85], [-3, 0.85]];
  B.prism(hull, -0.25, 0.45, wood, deck, { scaleTop: 1.08 });
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
