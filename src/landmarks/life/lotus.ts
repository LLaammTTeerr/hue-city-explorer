import * as THREE from 'three';
import { Buf, hex, shade, unflat, inRing } from '../../geo/buf.ts';
import { cityMaterial, enc } from '../../geo/materials.ts';
import { pondY } from '../../geo/terrain.ts';
import { quality } from '../../config.ts';
import { rng } from './paths.ts';

// Lotus on the still water: the moat and the lakes of the Citadel are full of it in summer.
// Lakes the satellite shows lotus-covered edge to edge, by a point inside each: no open drifts, about three times the
// leaves and larger ones, so that little water shows between them, and fewer blooms over so many leaves.
// hồ Học Hải round Tàng Thư Lâu (landmarks/places/tangthulau.js).
const FULL = [[-1306.8, -1328.3]];
export function buildLotus(data, group) {
  const rnd = rng(20261119);
  const pads = [], blooms = [];
  // the leaf budget is shared by every lake in proportion to what it wants; first come, first served left the lakes
  // late in data.ponds (hồ Học Hải among them) with none at all
  const MAX = quality.low ? 8000 : 32000;
  const lakes = [];
  (data.ponds || []).forEach((poly, pi) => {
    const rings = poly.map(unflat), outer = rings[0];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, area = 0;
    for (let i = 0; i < outer.length; i++) {
      const p = outer[i], q = outer[(i + 1) % outer.length];
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]);
      area += p[0] * q[1] - q[0] * p[1];
    }
    area = Math.abs(area) / 2;
    if (area < 900) return;
    const full = FULL.some(([x, z]) => inRing(x, z, outer));
    lakes.push({ pi, rings, outer, x0, x1, z0, z1, full, want: full ? Math.min(4000, Math.round(area / 7)) : Math.min(1100, Math.round(area / 26)) });
  });
  const share = Math.min(1, MAX / Math.max(1, lakes.reduce((a, l) => a + l.want, 0)));
  for (const { pi, rings, outer, x0, x1, z0, z1, full, want: w0 } of lakes) {
    const Y = pondY(data, pi), want = Math.round(w0 * share);
    for (let k = 0, tries = 0; k < want && tries < want * 6 && pads.length < MAX; tries++) {
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      // lotus grows in drifts, thickest toward the banks
      if (!full && Math.sin(x * 0.045) * Math.cos(z * 0.052) + Math.sin((x + z) * 0.021) < 0.15 - rnd() * 0.5) continue;
      const wet = (px, pz) => inRing(px, pz, outer) && !rings.slice(1).some((h) => inRing(px, pz, h));
      if (!wet(x, z)) continue;
      // leaves are drawn about twice life size so the drifts read from the air; the whole leaf floats on the pond,
      // none of it reaching over the bank, where it would run under the ground (check-burial)
      const r = (full ? 1.6 : 1.1) + rnd() * 1.2;
      if (![0, 1, 2, 3, 4, 5].every((j) => wet(x + r * Math.cos(j * 1.047), z + r * Math.sin(j * 1.047)))) continue;
      pads.push([x, z, r, rnd() * 6.28, Y]);
      if (rnd() < (full ? 0.07 : 0.2)) blooms.push([x + (rnd() - 0.5) * 1.2, z + (rnd() - 0.5) * 1.2, 1.3 + rnd() * 0.9, Y]);
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
  pads.forEach(([x, z, r, a, y], i) => {
    q.setFromAxisAngle(up, a); p.set(x, y + 0.05 + (i % 5) * 0.012, z); s.set(r, r, r); // stepped heights: leaves that overlap do not flicker
    padMesh.setMatrixAt(i, m.compose(p, q, s));
    padMesh.setColorAt(i, enc(shade(greens[i % greens.length], 0.85 + ((i * 7) % 10) / 33), c));
  });
  const bloomMesh = new THREE.InstancedMesh(bloomGeo.geometry(), mat, Math.max(1, blooms.length));
  bloomMesh.count = blooms.length; // with no blooms, no stray identity instance at the origin
  blooms.forEach(([x, z, r, y], i) => {
    q.setFromAxisAngle(up, i); p.set(x, y + 0.25, z); s.set(r, r, r);
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

