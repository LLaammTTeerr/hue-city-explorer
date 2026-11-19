import * as THREE from 'three';
import { Buf, hex, shade, unflat } from '../geo/buf.js';
import { cityMaterial, enc } from '../geo/materials.js';
import { rise } from '../geo/terrain.js';
import { LAND_Y, POND_Y, quality } from '../config.js';

// Small living things that make the model feel inhabited. All illustrative.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};

// Lotus on the still water: the moat and the lakes of the Citadel are full of it in summer.
export function buildLotus(data, group) {
  const rnd = rng(20261119);
  const pads = [], blooms = [];
  const MAX = quality.low ? 5000 : 14000;
  for (const poly of data.ponds || []) {
    const rings = poly.map(unflat), outer = rings[0];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, area = 0;
    for (let i = 0; i < outer.length; i++) {
      const p = outer[i], q = outer[(i + 1) % outer.length];
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]);
      area += p[0] * q[1] - q[0] * p[1];
    }
    area = Math.abs(area) / 2;
    if (area < 900) continue;
    const want = Math.min(1100, Math.round(area / 26));
    for (let k = 0, tries = 0; k < want && tries < want * 6 && pads.length < MAX; tries++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      // lotus grows in drifts, thickest toward the banks
      if (Math.sin(x * 0.045) * Math.cos(z * 0.052) + Math.sin((x + z) * 0.021) < 0.15 - rnd() * 0.5) continue;
      if (!inRing(x, z, outer) || rings.slice(1).some((h) => inRing(x, z, h))) continue;
      // leaves are drawn about twice life size so the drifts read from the air
      pads.push([x, z, 1.1 + rnd() * 1.2, rnd() * 6.28]);
      if (rnd() < 0.2) blooms.push([x + (rnd() - 0.5) * 1.2, z + (rnd() - 0.5) * 1.2, 1.3 + rnd() * 0.9]);
      k++;
    }
  }
  if (!pads.length) return;
  const mat = cityMaterial();
  const padGeo = new Buf(16);
  // a leaf: a disc with one notch, slightly dished
  for (let i = 0; i < 7; i++) {
    const a0 = 0.35 + (i / 7) * (Math.PI * 2 - 0.7), a1 = 0.35 + ((i + 1) / 7) * (Math.PI * 2 - 0.7);
    padGeo.tri([0, 0, 0], [Math.cos(a0), 0.07, Math.sin(a0)], [Math.cos(a1), 0.07, Math.sin(a1)], i % 2 ? [1, 1, 1] : [0.86, 0.86, 0.86], [0, 1, 0]);
  }
  const bloomGeo = new Buf(32);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, b = a + 0.6;
    bloomGeo.tri([0, 0.1, 0], [Math.cos(a) * 0.42, 0.75, Math.sin(a) * 0.42], [Math.cos(b) * 0.42, 0.75, Math.sin(b) * 0.42], [1, 1, 1], [Math.cos(a), 0.6, Math.sin(a)]);
    bloomGeo.tri([0, 0.1, 0], [Math.cos(b) * 0.42, 0.75, Math.sin(b) * 0.42], [Math.cos(a) * 0.42, 0.75, Math.sin(a) * 0.42], [0.8, 0.8, 0.8], [-Math.cos(a), 0.3, -Math.sin(a)]);
  }
  bloomGeo.cyl(0, 0, -0.3, 0.12, 0.03, 0.03, 4, [0.3, 0.5, 0.3], { cap: false });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  const greens = ['#5f9a58', '#6aa460', '#4f8a52', '#79a965', '#8fb06a'].map(hex), pinks = ['#f2a7bd', '#ee8fb0', '#f7c6d4', '#fbe9ec'].map(hex);
  const padMesh = new THREE.InstancedMesh(padGeo.geometry(), mat, pads.length);
  pads.forEach(([x, z, r, a], i) => {
    q.setFromAxisAngle(up, a); p.set(x, POND_Y + 0.05, z); s.set(r, r, r);
    padMesh.setMatrixAt(i, m.compose(p, q, s));
    padMesh.setColorAt(i, enc(shade(greens[i % greens.length], 0.85 + ((i * 7) % 10) / 33), c));
  });
  const bloomMesh = new THREE.InstancedMesh(bloomGeo.geometry(), mat, Math.max(1, blooms.length));
  blooms.forEach(([x, z, r], i) => {
    q.setFromAxisAngle(up, i); p.set(x, POND_Y + 0.25, z); s.set(r, r, r);
    bloomMesh.setMatrixAt(i, m.compose(p, q, s));
    bloomMesh.setColorAt(i, enc(pinks[i % pinks.length], c));
  });
  for (const mesh of [padMesh, bloomMesh]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    group.add(mesh);
  }
}

// Motorbikes and a few cars on the main streets — Huế moves on two wheels.
export function buildTraffic(data, group) {
  const rnd = rng(1899);
  const paths = [];
  for (const [c, bridge, flat] of data.roads) {
    if (c > 1 || bridge) continue;
    const pts = unflat(flat);
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    if (acc[acc.length - 1] > 160) paths.push({ pts, acc, len: acc[acc.length - 1], wide: c === 0 });
  }
  if (!paths.length) return { update() {} };
  const total = paths.reduce((s, p) => s + p.len, 0);
  const count = quality.low ? 150 : 380;
  const bikeGeo = new Buf(48), carGeo = new Buf(48);
  const W = [1, 1, 1];
  // rider and machine as three small blocks; +x is forward
  bikeGeo.box(0, 0, 0.3, 0.85, 1.7, 0.45, 0, [0.5, 0.5, 0.5], { bottom: true });
  bikeGeo.box(-0.1, 0, 0.85, 1.5, 0.42, 0.46, 0, W);
  bikeGeo.box(-0.06, 0, 1.5, 1.78, 0.3, 0.3, 0, [0.35, 0.35, 0.35]);
  carGeo.box(0, 0, 0.3, 0.95, 4.2, 1.75, 0, W, { bottom: true });
  carGeo.box(-0.2, 0, 0.95, 1.5, 2.3, 1.6, 0, [0.42, 0.5, 0.56], { taper: 0.86 });
  const mat = cityMaterial();
  const riders = [], cars = [];
  for (let i = 0; i < count; i++) {
    let r = rnd() * total, path = paths[0];
    for (const pth of paths) { if (r < pth.len) { path = pth; break; } r -= pth.len; }
    const car = rnd() < 0.14;
    (car ? cars : riders).push({ path, s: rnd() * path.len, dir: rnd() < 0.5 ? 1 : -1, speed: car ? 7 + rnd() * 4 : 5.5 + rnd() * 5, lane: (car ? 2.6 : 1.6) + rnd() * (path.wide ? 2.4 : 1.0), seg: 1 });
  }
  const bikeCols = ['#b3352b', '#2f4f7a', '#2a2a2e', '#e8e4da', '#d6a12e', '#3f7a5a', '#7a3f5a'].map(hex), carCols = ['#eeeae2', '#c9c9c6', '#2e3338', '#2f8a5a', '#8a2f2c', '#3f5f8a'].map(hex);
  const c = new THREE.Color();
  const make = (list, geo, cols) => {
    const mesh = new THREE.InstancedMesh(geo.geometry(), mat, Math.max(1, list.length));
    list.forEach((v, i) => mesh.setColorAt(i, enc(cols[i % cols.length], c)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = !quality.low;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  };
  const bikeMesh = make(riders, bikeGeo, bikeCols), carMesh = make(cars, carGeo, carCols);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const step = (list, mesh, dt) => {
    for (let i = 0; i < list.length; i++) {
      const v = list[i], { pts, acc, len } = v.path;
      v.s += v.dir * v.speed * dt;
      if (v.s > len) { v.s = len; v.dir = -1; } else if (v.s < 0) { v.s = 0; v.dir = 1; }
      while (v.seg < acc.length - 1 && acc[v.seg] < v.s) v.seg++;
      while (v.seg > 1 && acc[v.seg - 1] > v.s) v.seg--;
      const a = pts[v.seg - 1], b = pts[v.seg], t = (v.s - acc[v.seg - 1]) / Math.max(1e-6, acc[v.seg] - acc[v.seg - 1]);
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const tx = (dx / l) * v.dir, tz = (dz / l) * v.dir;
      const x = a[0] + dx * t - tz * v.lane, z = a[1] + dz * t + tx * v.lane; // keep right
      q.setFromAxisAngle(up, Math.atan2(-tz, tx));
      p.set(x, LAND_Y + rise(x, z) + 0.06, z);
      mesh.setMatrixAt(i, m.compose(p, q, sc));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { update(dt) { step(riders, bikeMesh, dt); step(cars, carMesh, dt); } };
}
