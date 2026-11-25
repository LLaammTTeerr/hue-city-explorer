import * as THREE from 'three';
import { Buf, hex, shade, unflat, inRing } from '../../geo/buf.ts';
import { cityMaterial, enc } from '../../geo/materials.ts';
import { pondY } from '../../geo/terrain.ts';
import { quality } from '../../config.ts';
import { rng } from './paths.ts';

// Lotus on the still water: the moat and the lakes of the Citadel are full of it in summer.
// hồ Học Hải round Tàng Thư Lâu (landmarks/places/tangthulau.js).
const FULL_LAKES = [[-1306.8, -1328.3]];
const MIN_POND_AREA = 900;
const PAD_SEGS = 7;
const BLOOM_PETALS = 6;

const PAD_GREENS = ['#5f9a58', '#6aa460', '#4f8a52', '#79a965', '#8fb06a'].map(hex);
const BLOOM_PINKS = ['#f2a7bd', '#ee8fb0', '#f7c6d4', '#fbe9ec'].map(hex);

function buildLotusGeometries() {
  const padGeo = new Buf(16);
  for (let i = 0; i < PAD_SEGS; i++) {
    const a0 = 0.35 + (i / PAD_SEGS) * (Math.PI * 2 - 0.7);
    const a1 = 0.35 + ((i + 1) / PAD_SEGS) * (Math.PI * 2 - 0.7);
    padGeo.tri([0, 0, 0], [Math.cos(a0), 0.07, Math.sin(a0)], [Math.cos(a1), 0.07, Math.sin(a1)], i % 2 ? [1, 1, 1] : [0.86, 0.86, 0.86], [0, 1, 0]);
  }
  const bloomGeo = new Buf(32);
  for (let i = 0; i < BLOOM_PETALS; i++) {
    const a0 = (i / BLOOM_PETALS) * Math.PI * 2;
    const a1 = a0 + 0.6;
    bloomGeo.tri([0, 0.1, 0], [Math.cos(a0) * 0.42, 0.75, Math.sin(a0) * 0.42], [Math.cos(a1) * 0.42, 0.75, Math.sin(a1) * 0.42], [1, 1, 1], [Math.cos(a0), 0.6, Math.sin(a0)]);
    bloomGeo.tri([0, 0.1, 0], [Math.cos(a1) * 0.42, 0.75, Math.sin(a1) * 0.42], [Math.cos(a0) * 0.42, 0.75, Math.sin(a0) * 0.42], [0.8, 0.8, 0.8], [-Math.cos(a0), 0.3, -Math.sin(a0)]);
  }
  bloomGeo.cyl(0, 0, -0.3, 0.12, 0.03, 0.03, 4, [0.3, 0.5, 0.3], { cap: false });
  return { padGeo, bloomGeo };
}

export function buildLotus(data, group) {
  const rnd = rng(20261119);
  const pads = [], blooms = [];
  const maxPads = quality.low ? 8000 : 32000;
  const lakes = [];

  (data.ponds || []).forEach((poly, pondIdx) => {
    const rings = poly.map(unflat), outer = rings[0];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, area = 0;
    for (let i = 0; i < outer.length; i++) {
      const ptA = outer[i], ptB = outer[(i + 1) % outer.length];
      x0 = Math.min(x0, ptA[0]); x1 = Math.max(x1, ptA[0]);
      z0 = Math.min(z0, ptA[1]); z1 = Math.max(z1, ptA[1]);
      area += ptA[0] * ptB[1] - ptB[0] * ptA[1];
    }
    area = Math.abs(area) / 2;
    if (area < MIN_POND_AREA) return;
    const isFull = FULL_LAKES.some(([x, z]) => inRing(x, z, outer));
    lakes.push({ pondIdx, rings, outer, x0, x1, z0, z1, isFull, want: isFull ? Math.min(4000, Math.round(area / 7)) : Math.min(1100, Math.round(area / 26)) });
  });

  const share = Math.min(1, maxPads / Math.max(1, lakes.reduce((sum, lake) => sum + lake.want, 0)));
  for (const { pondIdx, rings, outer, x0, x1, z0, z1, isFull, want: rawWant } of lakes) {
    const waterLevel = pondY(data, pondIdx);
    const want = Math.round(rawWant * share);
    const isWet = (px, pz) => inRing(px, pz, outer) && !rings.slice(1).some((hole) => inRing(px, pz, hole));
    for (let k = 0, tries = 0; k < want && tries < want * 6 && pads.length < maxPads; tries++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      if (!isFull && Math.sin(x * 0.045) * Math.cos(z * 0.052) + Math.sin((x + z) * 0.021) < 0.15 - rnd() * 0.5) continue;
      if (!isWet(x, z)) continue;
      const radius = (isFull ? 1.6 : 1.1) + rnd() * 1.2;
      if (![0, 1, 2, 3, 4, 5].every((j) => isWet(x + radius * Math.cos(j * 1.047), z + radius * Math.sin(j * 1.047)))) continue;
      pads.push([x, z, radius, rnd() * 6.28, waterLevel]);
      if (rnd() < (isFull ? 0.07 : 0.2)) blooms.push([x + (rnd() - 0.5) * 1.2, z + (rnd() - 0.5) * 1.2, 1.3 + rnd() * 0.9, waterLevel]);
      k++;
    }
  }
  if (!pads.length) return;

  const mat = cityMaterial();
  const { padGeo, bloomGeo } = buildLotusGeometries();
  const mtx = new THREE.Matrix4(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), pos = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0), tmpCol = new THREE.Color();

  const padMesh = new THREE.InstancedMesh(padGeo.geometry(), mat, pads.length);
  pads.forEach(([x, z, radius, angle, level], i) => {
    quat.setFromAxisAngle(upAxis, angle);
    pos.set(x, level + 0.05 + (i % 5) * 0.012, z);
    scl.set(radius, radius, radius);
    padMesh.setMatrixAt(i, mtx.compose(pos, quat, scl));
    padMesh.setColorAt(i, enc(shade(PAD_GREENS[i % PAD_GREENS.length], 0.85 + ((i * 7) % 10) / 33), tmpCol));
  });

  const bloomMesh = new THREE.InstancedMesh(bloomGeo.geometry(), mat, Math.max(1, blooms.length));
  bloomMesh.count = blooms.length;
  blooms.forEach(([x, z, radius, level], i) => {
    quat.setFromAxisAngle(upAxis, i);
    pos.set(x, level + 0.25, z);
    scl.set(radius, radius, radius);
    bloomMesh.setMatrixAt(i, mtx.compose(pos, quat, scl));
    bloomMesh.setColorAt(i, enc(BLOOM_PINKS[i % BLOOM_PINKS.length], tmpCol));
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
