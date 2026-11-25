import * as THREE from 'three';
import { Buf, hex, unflat, inRing } from '../geo/buf.ts';
import { cityMaterial, lightMaterial, shared } from '../geo/materials.ts';
import { quality } from '../config.ts';
import { makeObstacles } from '../geo/clearance.ts';
import { makeLanterns } from './lanterns.ts';

const DECIMETRES_PER_METRE = 10;
const MILLIRADIANS_PER_RADIAN = 1000;
const WAKE_HALF = Math.tan((19.5 * Math.PI) / 180) * 1.05;
const LANE_SLIDE_M = 4;
const ROUTE_STEP_M = 3;
const MIN_RUN_M = 300;
const FLEET_COUNT = 5;
const GLOW_VISIBLE_THRESHOLD = 0.01;

// A smooth hull lofted through stations along x (local +x is the bow).
function loftHull(buf: Buf, { x0, x1, n, w, sheer, keel, bands, deck, deckY }: any) {
  const hullPt = (x: number, t: number, side: number) => {
    const ang = (t * Math.PI) / 2;
    const halfW = w(x);
    return [x, keel(x) + (sheer(x) - keel(x)) * (1 - Math.cos(ang)), side * halfW * Math.pow(Math.sin(ang), 0.7)];
  };
  const hullNrm = (x: number, t: number, side: number) => {
    const eps = 1e-3;
    const ptA = hullPt(x, Math.min(1, t + eps), side), ptB = hullPt(x, Math.max(0, t - eps), side);
    const pxA = hullPt(x + eps, t, side), pxB = hullPt(x - eps, t, side);
    const u = [ptA[0] - ptB[0], ptA[1] - ptB[1], ptA[2] - ptB[2]];
    const v = [pxA[0] - pxB[0], pxA[1] - pxB[1], pxA[2] - pxB[2]];
    let nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (nrm[2] * side + (t < 0.3 ? -nrm[1] : 0) < 0) nrm = nrm.map((val) => -val);
    if (!(Math.hypot(nrm[0], nrm[1], nrm[2]) > 1e-9)) nrm = [0, -1, 0];
    return nrm;
  };
  const stations: number[] = [];
  for (let i = 0; i <= n; i++) stations.push(x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos((i / n) * Math.PI)));
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const xa = stations[i], xb = stations[i + 1];
      for (let k = 0; k + 1 < bands.length; k++) {
        const ta = bands[k][0], tb = bands[k + 1][0], col = bands[k][1], triCols = [col, col, col];
        const p0 = hullPt(xa, ta, side), p1 = hullPt(xb, ta, side), p2 = hullPt(xb, tb, side), p3 = hullPt(xa, tb, side);
        const n0 = hullNrm(xa, ta, side), n1 = hullNrm(xb, ta, side), n2 = hullNrm(xb, tb, side), n3 = hullNrm(xa, tb, side);
        if (side > 0) { buf.smoothTri([p0, p1, p2], [n0, n1, n2], triCols); buf.smoothTri([p0, p2, p3], [n0, n2, n3], triCols); }
        else { buf.smoothTri([p0, p2, p1], [n0, n2, n1], triCols); buf.smoothTri([p0, p3, p2], [n0, n3, n2], triCols); }
      }
    }
  }
  const up = [0, 1, 0];
  for (let i = 0; i < n; i++) {
    const xa = stations[i], xb = stations[i + 1];
    const wa = w(xa) * 0.97, wb = w(xb) * 0.97, ya = deckY(xa), yb = deckY(xb);
    buf.quad([xa, ya, -wa], [xb, yb, -wb], [xb, yb, wb], [xa, ya, wa], deck, up);
  }
}

// Thuyền rồng — the dragon boats that work the Hương. Local +x is the bow.
function dragonBoatGeometry() {
  const buf = new Buf(900);
  const yellow = hex('#e8b530'), red = hex('#b8322a'), green = hex('#2f7d5c'), wood = hex('#7a5136'), cream = hex('#efe2c2');
  const woodDark = hex('#5e3e2a'), white = hex('#f4efe2'), dark = hex('#1d1a17');
  const isLow = quality.low;

  loftHull(buf, {
    x0: -10.2, x1: 10.4, n: isLow ? 8 : 14,
    w: (x: number) => {
      const u = x >= 0.5 ? (x - 0.5) / 9.9 : (0.5 - x) / 10.7;
      return Math.max(0.06, 2.12 * Math.pow(Math.max(0, 1 - Math.pow(u, x >= 0.5 ? 2.2 : 3.2)), 0.55));
    },
    sheer: (x: number) => 0.98 + 0.28 * Math.pow(Math.abs(x) / 10.3, 3),
    keel: (x: number) => -0.42 + 0.5 * Math.pow(Math.abs(x) / 10.4, 4),
    bands: isLow ? [[0, woodDark], [0.45, wood], [0.86, red], [1, red]] : [[0, woodDark], [0.3, wood], [0.62, wood], [0.86, red], [1, red]],
    deck: hex('#a98a64'),
    deckY: (x: number) => 0.9 + 0.22 * Math.pow(Math.abs(x) / 10.3, 3),
  });

  buf.box(-2.6, 0, 0.95, 2.75, 10.4, 3.3, 0, cream, { top: red });
  for (let x = -7.2; x <= 2.2; x += 1.9) buf.box(x, 0, 0.95, 2.75, 0.24, 3.42, 0, red);
  buf.hip(-2.6, 0, 11.6, 3.9, 0, 2.75, 0.95, yellow, { flare: 0.28, over: 0.2, ridgeCol: red });
  buf.box(-2.6, 0, 3.3, 3.75, 4.4, 1.7, 0, green);
  buf.hip(-2.6, 0, 5.2, 2.3, 0, 3.75, 0.6, yellow, { flare: 0.2 });

  // dragon bow & stern tail
  buf.beam([8.0, 0.95, 0], [9.5, 1.5, 0], 0.46, 0.5, yellow);
  buf.beam([9.5, 1.5, 0], [10.3, 2.3, 0], 0.4, 0.44, yellow);
  buf.beam([10.3, 2.3, 0], [11.5, 2.2, 0], 0.5, 0.42, red);
  buf.beam([11.5, 2.2, 0], [12.0, 2.0, 0], 0.34, 0.26, yellow);
  buf.beam([10.5, 2.5, 0.16], [9.9, 3.0, 0.34], 0.08, 0.08, yellow);
  buf.beam([10.5, 2.5, -0.16], [9.9, 3.0, -0.34], 0.08, 0.08, yellow);
  for (let i = 0; i < 3; i++) buf.beam([8.4 + i * 0.6, 1.3 + i * 0.3, 0], [8.5 + i * 0.6, 1.75 + i * 0.3, 0], 0.07, 0.3, green);
  buf.beam([10.4, 1.95, 0], [11.7, 1.72, 0], 0.36, 0.16, red);
  for (const side of [-1, 1]) {
    buf.box(10.75, side * 0.24, 2.36, 2.56, 0.18, 0.08, 0, white);
    buf.box(10.8, side * 0.285, 2.4, 2.52, 0.08, 0.03, 0, dark);
  }
  buf.beam([10.2, 1.85, 0], [10.0, 1.35, 0], 0.18, 0.12, green);
  buf.beam([-9.4, 0.9, 0], [-11.0, 2.3, 0], 0.44, 0.44, yellow);
  buf.beam([-11.0, 2.3, 0], [-11.5, 3.3, 0], 0.3, 0.3, red);
  return buf.geometry();
}

function makeTrack(pts: number[][]) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc[acc.length - 1];
  const segDir = (i: number) => {
    const j = Math.max(1, Math.min(pts.length - 1, i));
    const dx = pts[j][0] - pts[j - 1][0], dz = pts[j][1] - pts[j - 1][1], len = Math.hypot(dx, dz) || 1;
    return [dx / len, dz / len];
  };
  const vertexTangents = pts.map((_, idx) => {
    const u = segDir(idx), v = segDir(idx + 1);
    const sx = u[0] + v[0], sz = u[1] + v[1], len = Math.hypot(sx, sz);
    return len > 1e-6 ? [sx / len, sz / len] : v;
  });
  return {
    total,
    at(dist: number, out: Record<string, any> = {}) {
      const clamped = Math.max(0, Math.min(total, dist));
      let i = 1;
      while (i < acc.length - 1 && acc[i] < clamped) i++;
      const p0 = pts[i - 1], p1 = pts[i], t0 = vertexTangents[i - 1], t1 = vertexTangents[i];
      const frac = (clamped - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
      const tx = t0[0] + (t1[0] - t0[0]) * frac, tz = t0[1] + (t1[1] - t0[1]) * frac, len = Math.hypot(tx, tz) || 1;
      out.x = p0[0] + (p1[0] - p0[0]) * frac;
      out.z = p0[1] + (p1[1] - p0[1]) * frac;
      out.tx = tx / len;
      out.tz = tz / len;
      return out;
    },
  };
}

function riverTrack(data: any) {
  if (!data || !Array.isArray(data.river) || data.river.length < 6) return null;
  let longest: number[][] = [];
  let current: number[][] = [];
  for (const pt of unflat(data.river)) {
    if (pt[0] > -2300 && pt[0] < 700 && pt[1] > -700 && pt[1] < 1500) {
      const prev = current[current.length - 1];
      if (!prev || Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) > 0.5) current.push(pt);
    } else {
      if (current.length > longest.length) longest = current;
      current = [];
    }
  }
  if (current.length > longest.length) longest = current;
  return longest.length > 2 ? makeTrack(longest) : null;
}

function sampanGeometry() {
  const buf = new Buf(160);
  const wood = hex('#5f4433'), deck = hex('#8a6a4c'), mat = hex('#b89a6a'), matDark = hex('#9a7f55');
  loftHull(buf, {
    x0: -4.2, x1: 4.4, n: quality.low ? 5 : 7,
    w: (x: number) => {
      const u = x >= 0 ? x / 4.4 : -x / 4.2;
      return Math.max(0.05, 0.9 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 0.6));
    },
    sheer: (x: number) => 0.45 + 0.22 * Math.pow(Math.abs(x) / 4.3, 2.5),
    keel: (x: number) => -0.25 + 0.3 * Math.pow(Math.abs(x) / 4.3, 3),
    bands: [[0, wood], [0.55, wood], [1, wood]],
    deck,
    deckY: (x: number) => 0.4 + 0.18 * Math.pow(Math.abs(x) / 4.3, 2.5),
  });
  const x0 = -2.2, x1 = 1.2, rad = 0.95;
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI, a1 = ((i + 1) / 5) * Math.PI;
    const p0 = [Math.cos(a0) * rad, 0.45 + Math.sin(a0) * rad * 0.95];
    const p1 = [Math.cos(a1) * rad, 0.45 + Math.sin(a1) * rad * 0.95];
    buf.quad([x0, p0[1], p0[0]], [x1, p0[1], p0[0]], [x1, p1[1], p1[0]], [x0, p1[1], p1[0]], i % 2 ? mat : matDark, [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)]);
  }
  return buf.geometry();
}

function boatLightGeometry() {
  const winBuf = new Buf(48), lanBuf = new Buf(400);
  const white = [1, 1, 1];
  const posts: number[] = [];
  for (let x = -7.2; x <= 2.2; x += 1.9) posts.push(x);
  const edges = [-7.7, ...posts.flatMap((x) => [x - 0.14, x + 0.14]), 2.5];
  for (let i = 0; i + 1 < edges.length; i += 2) {
    const x0 = edges[i], x1 = edges[i + 1];
    if (x1 - x0 < 0.2) continue;
    for (const side of [-1, 1]) {
      const z = side * 1.71;
      winBuf.quad([x0, 1.55, z], [x1, 1.55, z], [x1, 2.38, z], [x0, 2.38, z], white, [0, 0, side]);
    }
  }
  for (const [x, side] of [[2.66, 1], [-7.86, -1]]) {
    winBuf.quad([x, 1.55, -0.9], [x, 1.55, 0.9], [x, 2.38, 0.9], [x, 2.38, -0.9], white, [side, 0, 0]);
  }

  const amber = hex('#ffb347'), red = hex('#e84a3c');
  let lanIdx = 0;
  const addLantern = (x: number, y: number, z: number, scale = 1) => {
    lanBuf.box(x, z, y - 0.2 * scale, y + 0.2 * scale, 0.3 * scale, 0.3 * scale, 0, lanIdx++ % 2 ? red : amber, { bottom: true });
  };
  const step = quality.low ? 2.4 : 1.2;
  for (const side of [-1, 1]) {
    lanIdx = side > 0 ? 0 : 1;
    for (let x = -8.0; x <= 2.9; x += step) addLantern(x, 2.48, side * 1.98);
  }
  addLantern(3.25, 2.55, 0);
  addLantern(-8.45, 2.55, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addLantern(-2.6 + sx * 2.75, 3.5, sz * 1.3, 0.85);
  lanIdx = 1; addLantern(10.9, 1.85, 0.42, 0.9);
  lanIdx = 1; addLantern(10.9, 1.85, -0.42, 0.9);
  lanIdx = 0; addLantern(-10.9, 1.75, 0, 0.9);
  return { windows: winBuf.geometry(), lanterns: lanBuf.geometry() };
}

function vertexLightMaterial(boost: number) {
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

function wakeGeometry(bow: number, len: number, segs: number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const dist = (len * i * i) / (segs * segs) + (len / segs) * 0.15 * i * (1 - i / segs);
    const halfW = 1.5 + dist * WAKE_HALF * 1.2;
    for (const v of [-1, 1]) { pos.push(bow - dist, 0, v * halfW); uv.push(dist, v); }
    if (i) { const base = (i - 1) * 2; idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
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
    vec2 q = vec2( d + uRun, y );
    float foam = vn( q * vec2( 0.9, 1.3 ) ) * 0.6 + vn( q * vec2( 2.3, 3.1 ) + 7.0 ) * 0.4;
    float edge = 1.0 / 1.2;
    float armX = ( a - edge ) / ( 0.07 + 0.05 * smoothstep( 0.0, uLen, d ) ), arm = exp( -armX * armX );
    float chev = 0.68 + 0.32 * sin( ( d * 0.95 - abs( y ) * 0.55 ) * 1.6 + foam * 2.4 );
    float lam = max( 3.0, 6.283 * uSpd * uSpd / 9.81 );
    float trans = ( 0.5 + 0.5 * cos( 6.283 * d / lam ) ) * smoothstep( edge, 0.2, a ) * 0.22;
    float sw = 1.3 + 0.07 * max( 0.0, d - uStern );
    float wash = exp( -( y / sw ) * ( y / sw ) ) * smoothstep( uStern - 3.0, uStern + 4.0, d ) * ( 0.35 + 0.65 * foam );
    float fade = smoothstep( 0.0, 2.8, d ) * exp( -d / ( uLen * mix( 0.42, 0.28, uGlow ) ) ) * smoothstep( uLen, uLen * 0.55, d );
    float k = ( arm * chev * ( 0.5 + 0.5 * foam ) * 0.9 + wash * 0.68 + trans * ( 1.0 - uGlow * 0.65 ) ) * fade * uAmt;
    float nearLantern = exp( -d / 28.0 );
    vec3 nightTint = mix( vec3( 0.30, 0.28, 0.46 ), vec3( 0.95, 0.70, 0.38 ), nearLantern * 0.72 );
    vec3 tint = mix( vec3( 0.86, 0.91, 0.93 ), nightTint, uGlow );
    float alpha = clamp( k * mix( 0.85, 0.42, uGlow ), 0.0, 0.72 );
    gl_FragColor = vec4( tint, alpha );
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function makeWake(group: THREE.Group, timeUniform: { value: number }, { bow = 9.8, stern = 20.5, len = 110 } = {}) {
  const geo = wakeGeometry(bow, len, quality.low ? 10 : 18);
  const uniforms = { uTime: timeUniform, uGlow: shared.uGlow, uAmt: { value: 0 }, uSpd: { value: 0 }, uLen: { value: len }, uRun: { value: 0 }, uStern: { value: stern } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vD; void main() { vD = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: WAKE_FRAG,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.layers.set(1);
  mesh.renderOrder = 2;
  mesh.raycast = () => {};
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.name = 'wake';
  group.add(mesh);

  const lastPos = new THREE.Vector3(), curPos = new THREE.Vector3();
  let hasLast = false, speed = 0;
  return (boat: THREE.Object3D, dt: number, fade = 1) => {
    if (!boat.visible) { mesh.visible = false; hasLast = false; return; }
    curPos.copy(boat.position);
    if (hasLast && dt > 1e-4) {
      const instSpeed = Math.hypot(curPos.x - lastPos.x, curPos.z - lastPos.z) / dt;
      if (instSpeed < 40) speed += (instSpeed - speed) * Math.min(1, dt * 2.5);
    } else speed = 0;
    lastPos.copy(curPos);
    hasLast = true;
    const amt = Math.min(1, Math.max(0, (speed - 0.4) / 4.0)) * fade;
    mesh.visible = amt > 0.01;
    if (!mesh.visible) return;
    mesh.position.set(curPos.x, 0.05, curPos.z);
    mesh.rotation.set(0, boat.rotation.y, 0);
    uniforms.uAmt.value = amt;
    uniforms.uSpd.value = Math.min(speed, 9);
    uniforms.uLen.value = len * Math.min(1.0, 0.45 + speed / 8);
    uniforms.uRun.value += speed * dt;
    if (uniforms.uRun.value > 4096) uniforms.uRun.value -= 4096;
  };
}

function fleetRouter(track: any, structures: any, lo: number[], hi: number[], isLand: ((x: number, z: number) => boolean) | null = null) {
  const wholeTrack = (want: number) => ({ lane: want, lo: 5, hi: track.total - 5 });
  if (!structures || !structures.pos || !(track.total > MIN_RUN_M)) return wholeTrack;

  const cellSize = 10;
  const reach = 42 + LANE_SLIDE_M + 16;
  const nearCells = new Set<number>();
  for (let dist = 0; dist <= track.total; dist += cellSize / 2) {
    const pt = track.at(dist);
    for (let gx = Math.floor((pt.x - reach) / cellSize); gx <= Math.floor((pt.x + reach) / cellSize); gx++) {
      for (let gz = Math.floor((pt.z - reach) / cellSize); gz <= Math.floor((pt.z + reach) / cellSize); gz++) nearCells.add(gx * 65536 + gz);
    }
  }
  const keepCell = (x0: number, z0: number, x1: number, z1: number) => {
    for (let gx = Math.floor(x0 / cellSize); gx <= Math.floor(x1 / cellSize); gx++) {
      for (let gz = Math.floor(z0 / cellSize); gz <= Math.floor(z1 / cellSize); gz++) if (nearCells.has(gx * 65536 + gz)) return true;
    }
    return false;
  };

  const obstacles = makeObstacles({ top: hi[1] + 0.5, keep: keepCell });
  for (let i = 0, pos = structures.pos; i + 2 < structures.n; i += 3) obstacles.add(pos, null, i * 3);
  const pt = { x: 0, z: 0, tx: 1, tz: 0 };

  const isPoseClear = (dist: number, lat: number, hx: number, hz: number) => {
    track.at(dist, pt);
    const cx = pt.x - pt.tz * lat, cz = pt.z + pt.tx * lat, yaw = Math.atan2(-hz, hx);
    if (isLand) {
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      for (const lx of [lo[0], hi[0]]) {
        for (const lz of [lo[2], hi[2]]) {
          if (isLand(cx + cosY * lx + sinY * lz, cz - sinY * lx + cosY * lz)) return false;
        }
      }
    }
    return !obstacles.hits(cx, cz, yaw, lo, hi, 1, true).length;
  };

  const isTurnClear = (endS: number, dir: number, lane: number) => {
    const turnR = lane, startS = endS - dir * turnR;
    for (let k = 0; k <= 16; k++) {
      const ang = (Math.PI * k) / 16, cosA = Math.cos(ang), sinA = Math.sin(ang);
      track.at(startS + dir * turnR * sinA, pt);
      const fwd = dir * turnR * cosA, side = -dir * lane * sinA;
      if (!isPoseClear(startS + dir * turnR * sinA, dir * lane * cosA, pt.tx * fwd - pt.tz * side, pt.tz * fwd + pt.tx * side)) return false;
    }
    return true;
  };

  return (want: number) => {
    let best: { score: number; lane: number; lo: number; hi: number } | null = null;
    for (let delta = 0; delta <= LANE_SLIDE_M; delta += 2) {
      for (const lane of delta ? [want + delta, want - delta] : [want]) {
        let runStart = -1, bestLo = 0, bestHi = -1;
        const steps = Math.floor((track.total - 10) / ROUTE_STEP_M);
        for (let i = 0; i <= steps + 1; i++) {
          const dist = 5 + i * ROUTE_STEP_M;
          let ok = i <= steps;
          if (ok) { track.at(dist, pt); ok = isPoseClear(dist, lane, pt.tx, pt.tz) && isPoseClear(dist, -lane, -pt.tx, -pt.tz); }
          if (ok && runStart < 0) runStart = dist;
          if (!ok && runStart >= 0) { if (dist - ROUTE_STEP_M - runStart > bestHi - bestLo) { bestLo = runStart; bestHi = dist - ROUTE_STEP_M; } runStart = -1; }
        }
        while (bestHi - bestLo > MIN_RUN_M && !isTurnClear(bestHi, 1, lane)) bestHi -= ROUTE_STEP_M;
        while (bestHi - bestLo > MIN_RUN_M && !isTurnClear(bestLo, -1, lane)) bestLo += ROUTE_STEP_M;
        if (!(bestHi - bestLo > MIN_RUN_M)) continue;
        const score = bestHi - bestLo - 20 * delta;
        if (!best || score > best.score) best = { score, lane, lo: bestLo, hi: bestHi };
      }
    }
    return best || wholeTrack(want);
  };
}

export function buildBoats(data: any, group: THREE.Group, structures: any = null) {
  const geo = dragonBoatGeometry();
  const mat = cityMaterial();
  let lights: any = null;
  try {
    const lightGeos = boatLightGeometry();
    const winMat = lightMaterial(0xffc66b, 1.35);
    winMat.polygonOffset = true;
    winMat.polygonOffsetFactor = -2;
    winMat.polygonOffsetUnits = -2;
    lights = { ...lightGeos, winMat, lanMat: vertexLightMaterial(1.5) };
  } catch { lights = null; }

  const winMeshes: THREE.Mesh[] = [];
  const lanMeshes: THREE.Mesh[] = [];
  const attachLights = (boatMesh: THREE.Mesh) => {
    if (!lights) return;
    const winMesh = new THREE.Mesh(lights.windows, lights.winMat);
    const lanMesh = new THREE.Mesh(lights.lanterns, lights.lanMat);
    for (const child of [winMesh, lanMesh]) {
      child.renderOrder = 19;
      child.raycast = () => {};
      child.visible = false;
      boatMesh.add(child);
    }
    winMeshes.push(winMesh);
    lanMeshes.push(lanMesh);
  };

  const moorings = data.moorings || [];
  if (moorings.length >= 3) {
    const sampanCount = Math.floor(moorings.length / 3);
    const sampans = new THREE.InstancedMesh(sampanGeometry(), mat, sampanCount);
    const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), scaleVec = new THREE.Vector3(), posVec = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < sampanCount; i++) {
      const sc = 0.85 + ((i * 37) % 10) / 25;
      quat.setFromAxisAngle(up, -moorings[i * 3 + 2] / MILLIRADIANS_PER_RADIAN + (i % 2 ? Math.PI : 0));
      posVec.set(moorings[i * 3] / DECIMETRES_PER_METRE, 0, moorings[i * 3 + 1] / DECIMETRES_PER_METRE);
      scaleVec.set(sc, sc, sc);
      sampans.setMatrixAt(i, mat4.compose(posVec, quat, scaleVec));
    }
    sampans.instanceMatrix.needsUpdate = true;
    sampans.castShadow = true;
    sampans.frustumCulled = false;
    group.add(sampans);
  }

  const createBoatMesh = () => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    attachLights(mesh);
    group.add(mesh);
    return mesh;
  };

  const track = riverTrack(data);
  const fleet: any[] = [];
  if (track) {
    geo.computeBoundingBox();
    const route = fleetRouter(track, structures, geo.boundingBox!.min.toArray(), geo.boundingBox!.max.toArray(), landTest(data));
    for (let i = 0; i < FLEET_COUNT; i++) {
      const { lane, lo, hi } = route(26 + (i % 3) * 8);
      fleet.push({
        mesh: createBoatMesh(),
        s: lo + ((hi - lo) * (i + 0.5)) / FLEET_COUNT,
        lo, hi,
        dir: i % 2 ? 1 : -1,
        speed: 3.2 + (i % 3) * 0.9,
        lane,
        phase: i * 1.7,
        turn: -1,
      });
    }
  }

  const wakeTime = { value: 0 };
  const samplePt = { x: 0, z: 0, tx: 1, tz: 0 };
  let wakes: [any, ReturnType<typeof makeWake>][] = [];
  try { wakes = fleet.map((boat) => [boat, makeWake(group, wakeTime)]); } catch { wakes = []; }

  return {
    update(dt: number, time: number) {
      const isLit = shared.uGlow.value >= GLOW_VISIBLE_THRESHOLD;
      for (let i = 0; i < winMeshes.length; i++) { winMeshes[i].visible = isLit; lanMeshes[i].visible = isLit; }
      for (const boat of fleet) {
        const turnR = Math.min(boat.lane, Math.max(1, (boat.hi - boat.lo) / 2 - 6));
        let lat: number, hx: number, hz: number;
        if (boat.turn >= 0) {
          boat.turn = Math.min(1, boat.turn + (boat.speed * dt) / ((Math.PI * (turnR + boat.lane)) / 2));
          const ang = Math.PI * boat.turn, cosA = Math.cos(ang), sinA = Math.sin(ang);
          track!.at(boat.s + boat.dir * turnR * sinA, samplePt);
          lat = boat.dir * boat.lane * cosA;
          const fwd = boat.dir * turnR * cosA, side = -boat.dir * boat.lane * sinA;
          hx = samplePt.tx * fwd - samplePt.tz * side;
          hz = samplePt.tz * fwd + samplePt.tx * side;
          if (boat.turn >= 1) { boat.dir = -boat.dir; boat.turn = -1; }
        } else {
          boat.s += boat.dir * boat.speed * dt;
          if (boat.dir > 0 ? boat.s > boat.hi - turnR : boat.s < boat.lo + turnR) {
            boat.s = boat.dir > 0 ? boat.hi - turnR : boat.lo + turnR;
            boat.turn = 0;
          }
          track!.at(boat.s, samplePt);
          lat = boat.dir * boat.lane;
          hx = samplePt.tx * boat.dir;
          hz = samplePt.tz * boat.dir;
        }
        boat.mesh.position.set(samplePt.x - samplePt.tz * lat, Math.sin(time * 0.9 + boat.phase) * 0.06, samplePt.z + samplePt.tx * lat);
        boat.mesh.rotation.set(Math.sin(time * 0.7 + boat.phase) * 0.012, Math.atan2(-hz, hx), 0);
      }
      wakeTime.value = Number.isFinite(time) ? time : 0;
      const stepDt = Number.isFinite(dt) ? Math.min(0.25, Math.max(0, dt)) : 0;
      for (const [boat, followWake] of wakes) followWake(boat.mesh, stepDt, boat.turn >= 0 ? 1 - 0.75 * Math.sin(Math.PI * boat.turn) : 1);
    },
  };
}

export function buildLanterns(data: any, group: THREE.Group) {
  const noop = { update() {} };
  try {
    return makeLanterns(data, group, riverTrack(data), landTest(data)) || noop;
  } catch (err) {
    console.warn('hoa đăng skipped:', err);
    return noop;
  }
}

// Dry land: inside a land polygon and outside its holes (and, with ponds, outside every pond).
export function landTest(data: any, { ponds: withPonds = false } = {}) {
  const isValidRing = (arr: any) => Array.isArray(arr) && arr.length >= 6;
  const polys: { rings: [number, number][][]; x0: number; x1: number; z0: number; z1: number }[] = [];
  for (const poly of (data && data.land) || []) {
    if (!Array.isArray(poly) || !isValidRing(poly[0])) continue;
    const rings = poly.filter(isValidRing).map(unflat);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const pt of rings[0]) { x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]); z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]); }
    polys.push({ rings, x0, x1, z0, z1 });
  }
  const ponds: [number, number][][] = [];
  if (withPonds) {
    for (const poly of (data && data.ponds) || []) {
      if (Array.isArray(poly) && isValidRing(poly[0])) ponds.push(unflat(poly[0]));
    }
  }
  return (x: number, z: number) => {
    let onDryLand = false;
    for (const poly of polys) {
      if (x < poly.x0 || x > poly.x1 || z < poly.z0 || z > poly.z1) continue;
      if (inRing(x, z, poly.rings[0]) && !poly.rings.slice(1).some((hole) => inRing(x, z, hole))) { onDryLand = true; break; }
    }
    return onDryLand && !ponds.some((ring) => inRing(x, z, ring));
  };
}
