import * as THREE from 'three';
import { LAND_Y, PAL } from '../config.js';
import { landMaterial } from './materials.js';

// Height of the ground above the flat city floor, from the bundled grid (see scripts/build-data.mjs §9).
// Most of Huế is flat and reads zero; the hills in the west and south-west, and Hà Khê under chùa Thiên Mụ, rise.
let T = null;

export function initTerrain(data) {
  const t = data.terrain;
  if (!t) return;
  const h = new Float32Array(t.h.length);
  for (let i = 0; i < h.length; i++) h[i] = t.h[i] / 10;
  T = { x0: t.x0 / 10, z0: t.z0 / 10, step: t.step, nx: t.nx, nz: t.nz, h, cover: t.cover };
}

// Rise in metres at (x, z). Interpolates on the same triangles the terrain mesh is built from.
export function rise(x, z) {
  if (!T) return 0;
  const gx = (x - T.x0) / T.step, gz = (z - T.z0) / T.step;
  if (gx < 0 || gz < 0 || gx >= T.nx - 1 || gz >= T.nz - 1) return 0;
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
  const k = j * T.nx + i;
  const h00 = T.h[k], h10 = T.h[k + 1], h01 = T.h[k + T.nx], h11 = T.h[k + T.nx + 1];
  if (h00 === 0 && h10 === 0 && h01 === 0 && h11 === 0) return 0;
  return fx > fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
}
export const groundY = (x, z) => LAND_Y + rise(x, z);
// lowest ground under a footprint, so buildings on a slope are bedded in rather than left floating
export function baseUnder(ring) {
  let m = Infinity;
  for (const p of ring) m = Math.min(m, rise(p[0], p[1]));
  return m === Infinity ? 0 : m;
}

// Split a polyline finely where it crosses raised ground, so roads follow the slope.
export function drape(pts, maxLen = 7) {
  if (!T) return pts;
  let hilly = false;
  for (let i = 0; i < pts.length && !hilly; i++) {
    if (rise(pts[i][0], pts[i][1]) > 0) hilly = true;
    else if (i + 1 < pts.length && rise((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2) > 0) hilly = true;
  }
  if (!hilly) return pts;
  const out = [pts[0]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / maxLen));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

// The raised ground as its own mesh, laid over the flat slab (only cells that actually rise are built).
export function buildTerrainMesh() {
  if (!T) return null;
  const { nx, nz, step, h, cover } = T;
  const index = new Int32Array(nx * nz).fill(-1);
  const pos = [], col = [], idx = [];
  const land = new THREE.Color(PAL.land);
  const greens = [null, PAL.green.park, PAL.green.wood, PAL.green.grass, PAL.green.farm, PAL.green.cemetery, PAL.green.pitch, PAL.green.sacred].map((c) => (c ? new THREE.Color(c) : land));
  const vert = (i, j) => {
    const k = j * nx + i;
    if (index[k] >= 0) return index[k];
    index[k] = pos.length / 3;
    pos.push(T.x0 + i * step, LAND_Y + h[k] + 0.03, T.z0 + j * step);
    const c = greens[+cover[k] || 0];
    col.push(c.r, c.g, c.b);
    return index[k];
  };
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const k = j * nx + i;
    if (h[k] === 0 && h[k + 1] === 0 && h[k + nx] === 0 && h[k + nx + 1] === 0) continue;
    const a = vert(i, j), b = vert(i + 1, j), c = vert(i + 1, j + 1), d = vert(i, j + 1);
    idx.push(a, c, b, a, d, c);
  }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = landMaterial(0xffffff, true);
  mat.vertexColors = true;
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
