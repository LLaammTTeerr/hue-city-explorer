import * as THREE from 'three';
import { LAND_Y, POND_Y, PAL } from '../config.js';
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
export const groundY = (x, z) => LAND_Y + rise(x, z); // used by scripts/check-heights.mjs
// Surface of still-water body i: city ponds lie a little below the streets; lakes in the hills stand at their own
// level, flush with the ground the terrain holds flat around them.
export const pondY = (data, i) => { const lv = ((data.pondLv && data.pondLv[i]) || 0) / 10; return lv > 0 ? LAND_Y + lv + 0.08 : POND_Y; };
// the same for any point known to be on still water
export const waterY = (x, z) => { const r = rise(x, z); return r > 0 ? LAND_Y + r + 0.08 : POND_Y; };
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
  const greens = [null, PAL.green.park, PAL.green.wood, PAL.green.grass, PAL.green.farm, PAL.green.cemetery, PAL.green.pitch, PAL.green.sacred, PAL.green.paved].map((c) => (c ? new THREE.Color(c) : land));
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
  // where raised ground reaches the edge of the slab, close it with a cut face down to the flat floor (a model's sawn edge)
  {
    const earth = new THREE.Color('#8a7a62');
    const wall = (i0, j0, i1, j1) => {
      const k0 = j0 * nx + i0, k1 = j1 * nx + i1;
      if (h[k0] === 0 && h[k1] === 0) return;
      // the quad twice, once per winding, each on vertices of its own: shared vertices would sum the two facings'
      // normals to zero and the cut face would light as NaN
      const base = pos.length / 3;
      for (let s = 0; s < 2; s++) for (const [i, j, k] of [[i0, j0, k0], [i1, j1, k1]]) {
        pos.push(T.x0 + i * step, LAND_Y + h[k] + 0.03, T.z0 + j * step); col.push(earth.r, earth.g, earth.b);
        pos.push(T.x0 + i * step, LAND_Y - 0.5, T.z0 + j * step); col.push(earth.r * 0.8, earth.g * 0.8, earth.b * 0.8);
      }
      const b2 = base + 4;
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3, b2, b2 + 2, b2 + 1, b2 + 2, b2 + 3, b2 + 1); // both windings
    };
    for (let i = 0; i < nx - 1; i++) { wall(i, 0, i + 1, 0); wall(i, nz - 1, i + 1, nz - 1); }
    for (let j = 0; j < nz - 1; j++) { wall(0, j, 0, j + 1); wall(nx - 1, j, nx - 1, j + 1); }
  }
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
