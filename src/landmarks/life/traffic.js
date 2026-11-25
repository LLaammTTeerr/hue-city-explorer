import * as THREE from 'three';
import { Buf, hex, shade } from '../../geo/buf.js';
import { cityMaterial, enc } from '../../geo/materials.js';
import { bridgeProfiles, resample } from '../../geo/bridges.js';
import { quality } from '../../config.js';
import { rng, readRoads, mkPath, seek, place, chain, placeById, truongTienFrame, BRIDGE_TOP, tmp } from './paths.js';

// ---------- traffic ----------

// Motorbikes, cars, buses and cyclos on the main streets — Huế moves on two wheels.
// Real: the routes are the OSM class 0–2 streets (and their bridges, crossed at deck height), joined end to end;
// Trường Tiền's carriageway is driven at its own deck height. Illustrative: the vehicles, their mix and speeds.
export function buildTraffic(data, group) {
  const rnd = rng(1899);
  const roads = readRoads(data);
  const profiles = bridgeProfiles(data);
  const lines = roads.filter((r) => r.c <= 2 && r.len > 1).map((r) => {
    const P = r.bridge && profiles.get(r.flat);
    if (!P) return { pts: r.pts, len: r.len, c: r.c, w: r.w, h: r.bridge ? BRIDGE_TOP + 0.02 : NaN };
    // a humped deck: points close enough together to ride its curve; a flat one keeps its vertices, where
    // geo/city.js lays the deck at the profile's height (which may sit above BRIDGE_TOP, or climb between banks)
    let acc = 0;
    const R = P.rise > 0 ? resample(r.pts, 2) : { pts: r.pts, s: r.pts.map((q, i) => (acc += i ? Math.hypot(q[0] - r.pts[i - 1][0], q[1] - r.pts[i - 1][1]) : 0)) };
    return { pts: R.pts, len: r.len, c: r.c, w: r.w, h: BRIDGE_TOP + 0.02, hs: R.s.map((s) => Math.max(BRIDGE_TOP, P.base(s)) + P.bump(s) + 0.02) };
  });
  const paths = chain(lines, 1.5, (a, b) => Math.abs(a.c - b.c) <= 1).filter((p) => p.len > 160);
  const tt = truongTienFrame(data);
  if (!paths.length && !tt) return { update() {} };
  const places = placeById(data);

  const low = quality.low;
  const N = low ? 250 : 700;
  const nBus = low ? 4 : 12, nCyclo = low ? 6 : 18, nTT = tt ? (low ? 14 : 40) : 0;
  const nRest = N - nBus - nCyclo - nTT;

  // busier towards the centre, as the real city is
  const weightOf = (p) => { const m = p.pts[p.pts.length >> 1]; return p.len * (1 + 2.5 * Math.exp(-Math.hypot(m[0], m[1]) / 1800)); };
  const picker = (list, w) => {
    const cum = []; let t = 0;
    for (const p of list) { t += w(p); cum.push(t); }
    return () => { const r = rnd() * t; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; } return list[lo]; };
  };
  const HALF_W = { bike: 0.23, car: 0.875, bus: 1.225, cyclo: 0.475 };
  const V = [];
  const add = (kind, path, s0, s1, speed, lane, T, k = null) => {
    const dir = rnd() < 0.5 ? 1 : -1;
    const s = s0 + rnd() * (s1 - s0), seg = seek(path, s, 1), hw = HALF_W[kind] || 0.5;
    const eff = path.hw ? Math.min(lane, Math.max(0.5, path.hw[seg] - hw - 0.3)) : lane;
    V.push({ kind, path, s0, s1, s, dir, speed, lane, hw, off: dir * eff, turn: 0, T, seg, k, mesh: null, i: 0 });
  };
  if (paths.length) {
    const pick = picker(paths, weightOf);
    for (let i = 0; i < nRest; i++) {
      const p = pick(), wide = p.c === 0;
      if (rnd() < 0.14) add('car', p, 0, p.len, 7 + rnd() * 4, 2.6 + rnd() * (wide ? 2.2 : 1.0), 2.2);
      else add('bike', p, 0, p.len, 5.5 + rnd() * 5, 1.6 + rnd() * (wide ? 2.4 : 1.0), 1.2);
    }
    // city buses on the widest roads
    const trunk = paths.filter((p) => p.c === 0 && p.len > 400);
    if (trunk.length) {
      const pickT = picker(trunk, (p) => p.len);
      for (let i = 0; i < nBus; i++) { const p = pickT(); add('bus', p, 0, p.len, 6 + rnd() * 2.5, 3.3 + rnd() * 0.8, 3.2, [2.7, 2.0, 1.4]); }
    }
    // xích lô work the Citadel, the market and the visitors' streets: each keeps to the stretch of its route near one of them
    const hubs = ['kydai', 'ngomon', 'dongba', 'photay', 'ndchieu'].map((id) => places.get(id)).filter(Boolean);
    const spans = [];
    for (const p of paths) {
      let a = Infinity, b = -Infinity;
      p.pts.forEach((q, j) => { if (hubs.some((h) => Math.hypot(q[0] - h[0], q[1] - h[1]) < 450)) { a = Math.min(a, p.acc[j]); b = Math.max(b, p.acc[j]); } });
      if (b - a > 80) spans.push({ p, a, b });
    }
    if (spans.length) {
      const pickS = picker(spans, (s) => s.b - s.a);
      for (let i = 0; i < nCyclo; i++) { const s = pickS(); add('cyclo', s.p, s.a, s.b, 2.2 + rnd() * 1.4, 1.5 + rnd() * 1.4, 2.0); }
    }
  }
  // Trường Tiền: motorbikes and bicycles only, between the trusses
  let ttPath = null;
  if (tt) {
    const p = (ttPath = tt.lane(0, 0.04));
    for (let i = 0; i < nTT; i++) add('bike', p, 0, p.len, 4 + rnd() * 4, 0.9 + rnd() * Math.max(0.3, tt.trussX - 1.3), 1.2);
  }

  // geometry, +x forward
  const W = [1, 1, 1];
  const bikeGeo = new Buf(24); // machine and rider: 20 triangles
  bikeGeo.box(0, 0, 0.25, 0.85, 1.7, 0.42, 0, [0.45, 0.45, 0.45]);
  bikeGeo.box(-0.12, 0, 0.85, 1.72, 0.5, 0.46, 0, W, { taper: 0.6 });
  const carGeo = new Buf(24); // body and cabin: 20 triangles; a bus is the same shape scaled up
  carGeo.box(0, 0, 0.3, 0.95, 4.2, 1.75, 0, W);
  carGeo.box(-0.2, 0, 0.95, 1.5, 2.3, 1.6, 0, [0.42, 0.5, 0.56], { taper: 0.86 });
  const cycloGeo = new Buf(48); // passenger seat in front, driver pedalling behind: 40 triangles
  cycloGeo.box(0.55, 0, 0.35, 0.95, 0.9, 0.95, 0, W);
  cycloGeo.box(0.5, 0, 0.95, 1.5, 0.45, 0.5, 0, [0.95, 0.88, 0.78], { taper: 0.7 });
  cycloGeo.box(-0.45, 0, 0.3, 0.72, 1.1, 0.22, 0, [0.35, 0.35, 0.35]);
  cycloGeo.box(-0.8, 0, 0.72, 1.72, 0.42, 0.42, 0, [0.8, 0.75, 0.68], { taper: 0.65 });
  const mat = cityMaterial();
  const cols = {
    bike: ['#b3352b', '#2f4f7a', '#2a2a2e', '#e8e4da', '#d6a12e', '#3f7a5a', '#7a3f5a'].map(hex),
    car: ['#eeeae2', '#c9c9c6', '#2e3338', '#2f8a5a', '#8a2f2c', '#3f5f8a'].map(hex),
    bus: ['#e2b43c', '#2f7f9e', '#d9dcd6'].map(hex),
    cyclo: ['#3f6b5a', '#7a3a34', '#33415e', '#c8a24a'].map(hex),
  };
  const c = new THREE.Color();
  // which mesh draws each kind; a vehicle's colour goes by its index within its mesh
  const MESH_OF = { bike: 0, car: 1, bus: 1, cyclo: 2 };
  const count = [0, 0, 0];
  for (const v of V) { v.mi = MESH_OF[v.kind]; v.i = count[v.mi]++; }
  const make = (geo, n) => {
    const mesh = new THREE.InstancedMesh(geo.geometry(), mat, Math.max(1, n));
    mesh.count = n;
    mesh.visible = n > 0;
    mesh.castShadow = !quality.low;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  };
  const meshes = [make(bikeGeo, count[0]), make(carGeo, count[1]), make(cycloGeo, count[2])];
  for (const v of V) { v.mesh = meshes[v.mi]; const pal = cols[v.kind]; v.mesh.setColorAt(v.i, enc(pal[v.i % pal.length], c)); }
  for (const mesh of meshes) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function update(dt) {
    dt = Math.min(dt, 0.1);
    for (let i = 0; i < V.length; i++) {
      const v = V[i];
      if (v.turn > 0) v.turn = Math.max(0, v.turn - dt); // a slow U-turn at the end of the route, not a jump
      else {
        v.s += v.dir * v.speed * dt;
        if (v.s > v.s1) { v.s = v.s1; v.dir = -1; v.turn = v.T; } else if (v.s < v.s0) { v.s = v.s0; v.dir = 1; v.turn = v.T; }
      }
      v.seg = seek(v.path, v.s, v.seg);
      const lane = v.path.hw ? Math.min(v.lane, Math.max(0.5, v.path.hw[v.seg] - v.hw - 0.3)) : v.lane;
      // drift across to the right-hand lane for the current direction
      const want = v.dir * lane - v.off, mx = 2.5 * dt;
      v.off += want > mx ? mx : want < -mx ? -mx : want;
      place(v.path, v.s, v.seg, v.off, tmp);
      const yaw = Math.atan2(-tmp.dz * v.dir, tmp.dx * v.dir) + (v.turn > 0 ? (Math.PI * v.turn) / v.T : 0);
      q.setFromAxisAngle(up, yaw);
      p.set(tmp.x, tmp.y, tmp.z);
      if (v.k) sc.set(v.k[0], v.k[1], v.k[2]); else sc.set(1, 1, 1);
      v.mesh.setMatrixAt(v.i, m.compose(p, q, sc));
    }
    for (const mesh of meshes) if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { update };
}

