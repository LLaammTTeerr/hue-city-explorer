import * as THREE from 'three';
import { LAND_Y, POND_Y, PAL } from '../config.ts';
import { landMaterial } from './materials.ts';

const DECIMETRES_PER_METRE = 10;
const LAKE_SUBDIV = 5;
const LAKE_BED_DROP_M = 0.2;
const LAKE_SHORE_LIP_M = 3;
const LAKE_SURFACE_LIFT_M = 0.08;
const TERRAIN_PROUD_LIFT_M = 0.03;
const EDGE_WALL_DEPTH_M = 0.5;
const DEFAULT_DRAPE_STEP_M = 7;

interface TerrainGrid {
  x0: number;
  z0: number;
  step: number;
  nx: number;
  nz: number;
  h: Float32Array;
  cover: any;
}

// Height of the ground above the flat city floor, from the bundled grid (see scripts/build-data.mjs §9).
let terrainGrid: TerrainGrid | null = null;
let carvedNodes: Map<number, { h: number; lv: number; wet: boolean }> | null = null;
let fineCells: Map<number, Float32Array> | null = null;
let fineCellArr: (Float32Array | undefined)[] | null = null;
let riseMinX = Infinity, riseMaxX = -Infinity, riseMinZ = Infinity, riseMaxZ = -Infinity;

export function initTerrain(data: any) {
  const raw = data.terrain;
  if (!raw) return;
  const heights = new Float32Array(raw.h.length);
  for (let i = 0; i < heights.length; i++) heights[i] = raw.h[i] / DECIMETRES_PER_METRE;
  terrainGrid = {
    x0: raw.x0 / DECIMETRES_PER_METRE,
    z0: raw.z0 / DECIMETRES_PER_METRE,
    step: raw.step,
    nx: raw.nx,
    nz: raw.nz,
    h: heights,
    cover: raw.cover,
  };
  carveLakes(data);
  fineCellArr = new Array(terrainGrid.nx * terrainGrid.nz);
  if (fineCells) {
    for (const [k, v] of fineCells) fineCellArr[k] = v;
  }
  riseMinX = Infinity; riseMaxX = -Infinity; riseMinZ = Infinity; riseMaxZ = -Infinity;
  const { x0, z0, step, nx, nz } = terrainGrid;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const idx = j * nx + i;
      if (heights[idx] !== 0 || fineCellArr[idx] !== undefined) {
        const x = x0 + i * step, z = z0 + j * step;
        if (x - step < riseMinX) riseMinX = x - step;
        if (x + step > riseMaxX) riseMaxX = x + step;
        if (z - step < riseMinZ) riseMinZ = z - step;
        if (z + step > riseMaxZ) riseMaxZ = z + step;
      }
    }
  }
}

// The bare 25 m lattice, interpolated on the same triangles the terrain mesh is built from.
function coarseRise(x: number, z: number) {
  const grid = terrainGrid!;
  const gx = (x - grid.x0) / grid.step;
  const gz = (z - grid.z0) / grid.step;
  if (gx < 0 || gz < 0 || gx >= grid.nx - 1 || gz >= grid.nz - 1) return 0;
  const i = Math.floor(gx), j = Math.floor(gz);
  const fx = gx - i, fz = gz - j;
  const idx = j * grid.nx + i;
  const h00 = grid.h[idx], h10 = grid.h[idx + 1], h01 = grid.h[idx + grid.nx], h11 = grid.h[idx + grid.nx + 1];
  if (h00 === 0 && h10 === 0 && h01 === 0 && h11 === 0) return 0;
  return fx > fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
}

const pointInRing = (x: number, z: number, ring: number[][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p0 = ring[i], p1 = ring[j];
    if ((p0[1] > z) !== (p1[1] > z) && x < ((p1[0] - p0[0]) * (z - p0[1])) / (p1[1] - p0[1]) + p0[0]) inside = !inside;
  }
  return inside;
};

const distToRing = (x: number, z: number, ring: number[][]) => {
  let minDist = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p0 = ring[j], p1 = ring[i];
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1], lenSq = dx * dx + dz * dz || 1;
    const frac = Math.max(0, Math.min(1, ((x - p0[0]) * dx + (z - p0[1]) * dz) / lenSq));
    minDist = Math.min(minDist, Math.hypot(x - p0[0] - dx * frac, z - p0[1] - dz * frac));
  }
  return minDist;
};

function carveLakes(data: any) {
  const grid = terrainGrid!;
  carvedNodes = new Map();
  fineCells = new Map();
  const fineStep = grid.step / LAKE_SUBDIV;
  const fineW = (grid.nx - 1) * LAKE_SUBDIV + 1;
  const fineH = (grid.nz - 1) * LAKE_SUBDIV + 1;

  (data.ponds || []).forEach((poly: number[][], pondIdx: number) => {
    const level = ((data.pondLv && data.pondLv[pondIdx]) || 0) / DECIMETRES_PER_METRE;
    if (!(level > 0)) return;
    const rings = poly.map((flat) => {
      const pts: number[][] = [];
      for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] / DECIMETRES_PER_METRE, flat[i + 1] / DECIMETRES_PER_METRE]);
      return pts;
    });
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const pt of rings[0]) { x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]); z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]); }
    const i0 = Math.max(0, Math.floor((x0 - LAKE_SHORE_LIP_M - grid.x0) / fineStep));
    const i1 = Math.min(fineW - 1, Math.ceil((x1 + LAKE_SHORE_LIP_M - grid.x0) / fineStep));
    const j0 = Math.max(0, Math.floor((z0 - LAKE_SHORE_LIP_M - grid.z0) / fineStep));
    const j1 = Math.min(fineH - 1, Math.ceil((z1 + LAKE_SHORE_LIP_M - grid.z0) / fineStep));

    for (let fj = j0; fj <= j1; fj++) {
      for (let fi = i0; fi <= i1; fi++) {
        const x = grid.x0 + fi * fineStep, z = grid.z0 + fj * fineStep;
        const isWet = pointInRing(x, z, rings[0]) && !rings.slice(1).some((ring) => pointInRing(x, z, ring));
        let target: number;
        if (isWet) target = level - LAKE_BED_DROP_M;
        else if (rings.some((ring) => distToRing(x, z, ring) < LAKE_SHORE_LIP_M)) target = level;
        else continue;
        const key = fj * fineW + fi;
        const prev = carvedNodes!.get(key);
        const baseH = prev ? prev.h : coarseRise(x, z);
        if (baseH <= target) continue;
        carvedNodes!.set(key, { h: target, lv: level, wet: isWet || (prev ? prev.wet : false) });
      }
    }
  });

  // every cell that holds a carved node, or has one on its edge or corner, is drawn fine, so no seam opens
  for (const key of carvedNodes.keys()) {
    const fi = key % fineW, fj = (key - fi) / fineW;
    const ci = Math.floor(fi / LAKE_SUBDIV), cj = Math.floor(fj / LAKE_SUBDIV);
    for (const i of fi % LAKE_SUBDIV ? [ci] : [ci - 1, ci]) {
      for (const j of fj % LAKE_SUBDIV ? [cj] : [cj - 1, cj]) {
        if (i < 0 || j < 0 || i >= grid.nx - 1 || j >= grid.nz - 1) continue;
        const cellIdx = j * grid.nx + i;
        if (fineCells.has(cellIdx)) continue;
        const subGrid = new Float32Array((LAKE_SUBDIV + 1) * (LAKE_SUBDIV + 1));
        for (let sj = 0; sj <= LAKE_SUBDIV; sj++) {
          for (let si = 0; si <= LAKE_SUBDIV; si++) {
            const carved = carvedNodes.get((j * LAKE_SUBDIV + sj) * fineW + i * LAKE_SUBDIV + si);
            subGrid[sj * (LAKE_SUBDIV + 1) + si] = carved ? carved.h : coarseRise(grid.x0 + (i * LAKE_SUBDIV + si) * fineStep, grid.z0 + (j * LAKE_SUBDIV + sj) * fineStep);
          }
        }
        fineCells.set(cellIdx, subGrid);
      }
    }
  }
}

// Rise in metres at (x, z). Interpolates on the same triangles the terrain mesh is built from.
export function rise(x: number, z: number) {
  if (!terrainGrid || x < riseMinX || x > riseMaxX || z < riseMinZ || z > riseMaxZ) return 0;
  const gx = (x - terrainGrid.x0) / terrainGrid.step;
  const gz = (z - terrainGrid.z0) / terrainGrid.step;
  if (gx < 0 || gz < 0 || gx >= terrainGrid.nx - 1 || gz >= terrainGrid.nz - 1) return 0;
  const ci = gx | 0, cj = gz | 0;
  const cellIdx = cj * terrainGrid.nx + ci;
  const sub = fineCellArr ? fineCellArr[cellIdx] : undefined;
  if (!sub) {
    const fx = gx - ci, fz = gz - cj;
    const h = terrainGrid.h;
    const h00 = h[cellIdx], h10 = h[cellIdx + 1], h01 = h[cellIdx + terrainGrid.nx], h11 = h[cellIdx + terrainGrid.nx + 1];
    if (h00 === 0 && h10 === 0 && h01 === 0 && h11 === 0) return 0;
    return fx > fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  }
  const sx = (gx - ci) * LAKE_SUBDIV;
  const sz = (gz - cj) * LAKE_SUBDIV;
  const si = Math.min(LAKE_SUBDIV - 1, sx | 0);
  const sj = Math.min(LAKE_SUBDIV - 1, sz | 0);
  const fx = sx - si, fz = sz - sj;
  const idx = sj * (LAKE_SUBDIV + 1) + si;
  const h00 = sub[idx], h10 = sub[idx + 1], h01 = sub[idx + LAKE_SUBDIV + 1], h11 = sub[idx + LAKE_SUBDIV + 2];
  return fx > fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h11 - h01) * fx + (h01 - h00) * fz;
}

export const groundY = (x: number, z: number) => LAND_Y + rise(x, z);

export const pondY = (data: any, idx: number) => {
  const level = ((data.pondLv && data.pondLv[idx]) || 0) / DECIMETRES_PER_METRE;
  return level > 0 ? LAND_Y + level + LAKE_SURFACE_LIFT_M : POND_Y;
};

export const waterY = (x: number, z: number) => {
  if (terrainGrid && carvedNodes && carvedNodes.size) {
    const fineStep = terrainGrid.step / LAKE_SUBDIV;
    const fineW = (terrainGrid.nx - 1) * LAKE_SUBDIV + 1;
    const fi = Math.round((x - terrainGrid.x0) / fineStep);
    const fj = Math.round((z - terrainGrid.z0) / fineStep);
    for (let rad = 0; rad <= 1; rad++) {
      for (let dj = -rad; dj <= rad; dj++) {
        for (let di = -rad; di <= rad; di++) {
          const node = carvedNodes.get((fj + dj) * fineW + fi + di);
          if (node && node.wet) return LAND_Y + node.lv + LAKE_SURFACE_LIFT_M;
        }
      }
    }
  }
  const terrainRise = rise(x, z);
  return terrainRise > 0 ? LAND_Y + terrainRise + LAKE_SURFACE_LIFT_M : POND_Y;
};

export function baseUnder(ring: number[][]) {
  let minRise = Infinity;
  for (const pt of ring) minRise = Math.min(minRise, rise(pt[0], pt[1]));
  return minRise === Infinity ? 0 : minRise;
}

// Split a polyline finely where it crosses raised ground, so roads follow the slope.
export function drape(pts: number[][], maxLen = DEFAULT_DRAPE_STEP_M) {
  if (!terrainGrid || pts.length < 2) return pts;
  let px0 = Infinity, px1 = -Infinity, pz0 = Infinity, pz1 = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0], z = pts[i][1];
    if (x < px0) px0 = x;
    if (x > px1) px1 = x;
    if (z < pz0) pz0 = z;
    if (z > pz1) pz1 = z;
  }
  if (px1 < riseMinX || px0 > riseMaxX || pz1 < riseMinZ || pz0 > riseMaxZ) return pts;
  let isHilly = false;
  const checkStep = terrainGrid.step * 0.5;
  for (let i = 0; i < pts.length && !isHilly; i++) {
    if (rise(pts[i][0], pts[i][1]) > 0) { isHilly = true; break; }
    if (i + 1 < pts.length) {
      const p0 = pts[i], p1 = pts[i + 1];
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const steps = len > terrainGrid.step ? Math.ceil(len / checkStep) : 2;
      for (let k = 1; k < steps; k++) {
        if (rise(p0[0] + ((p1[0] - p0[0]) * k) / steps, p0[1] + ((p1[1] - p0[1]) * k) / steps) > 0) { isHilly = true; break; }
      }
    }
  }
  if (!isHilly) return pts;
  const out = [pts[0]];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / maxLen));
    for (let k = 1; k <= steps; k++) out.push([p0[0] + ((p1[0] - p0[0]) * k) / steps, p0[1] + ((p1[1] - p0[1]) * k) / steps]);
  }
  return out;
}

function appendTerrainEdgeWalls(grid: TerrainGrid, liftAt: (idx: number) => number, pos: number[], col: number[], idx: number[]) {
  const earth = new THREE.Color('#8a7a62');
  const { nx, nz, step, h } = grid;
  const addEdgeWall = (i0: number, j0: number, i1: number, j1: number) => {
    const k0 = j0 * nx + i0, k1 = j1 * nx + i1;
    if (h[k0] === 0 && h[k1] === 0) return;
    const base = pos.length / 3;
    for (let side = 0; side < 2; side++) {
      for (const [gi, gj, k] of [[i0, j0, k0], [i1, j1, k1]]) {
        pos.push(grid.x0 + gi * step, LAND_Y + h[k] + liftAt(k), grid.z0 + gj * step);
        col.push(earth.r, earth.g, earth.b);
        pos.push(grid.x0 + gi * step, LAND_Y - EDGE_WALL_DEPTH_M, grid.z0 + gj * step);
        col.push(earth.r * 0.8, earth.g * 0.8, earth.b * 0.8);
      }
    }
    const back = base + 4;
    idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3, back, back + 2, back + 1, back + 2, back + 3, back + 1);
  };
  for (let i = 0; i < nx - 1; i++) { addEdgeWall(i, 0, i + 1, 0); addEdgeWall(i, nz - 1, i + 1, nz - 1); }
  for (let j = 0; j < nz - 1; j++) { addEdgeWall(0, j, 0, j + 1); addEdgeWall(nx - 1, j, nx - 1, j + 1); }
}

// The raised ground as its own mesh, laid over the flat slab (only cells that actually rise are built).
export function buildTerrainMesh() {
  if (!terrainGrid) return null;
  const grid = terrainGrid;
  const { nx, nz, step, h, cover } = grid;
  const vertIndex = new Int32Array(nx * nz).fill(-1);
  const pos: number[] = [];
  const col: number[] = [];
  const indices: number[] = [];
  const landColor = new THREE.Color(PAL.land);
  const coverColors = [null, PAL.green.park, PAL.green.wood, PAL.green.grass, PAL.green.farm, PAL.green.cemetery, PAL.green.pitch, PAL.green.sacred, PAL.green.paved]
    .map((hexStr) => (hexStr ? new THREE.Color(hexStr) : landColor));

  const liftAt = (idx: number) => (h[idx] > 0 ? TERRAIN_PROUD_LIFT_M : -TERRAIN_PROUD_LIFT_M);
  const liftInCell = (i: number, j: number, fx: number, fz: number) => {
    const idx = j * nx + i;
    const l00 = liftAt(idx), l10 = liftAt(idx + 1), l01 = liftAt(idx + nx), l11 = liftAt(idx + nx + 1);
    return fx > fz ? l00 + (l10 - l00) * fx + (l11 - l10) * fz : l00 + (l11 - l01) * fx + (l01 - l00) * fz;
  };
  const coarseVert = (i: number, j: number) => {
    const idx = j * nx + i;
    if (vertIndex[idx] >= 0) return vertIndex[idx];
    vertIndex[idx] = pos.length / 3;
    pos.push(grid.x0 + i * step, LAND_Y + h[idx] + liftAt(idx), grid.z0 + j * step);
    const clr = coverColors[+cover[idx] || 0];
    col.push(clr.r, clr.g, clr.b);
    return vertIndex[idx];
  };

  const fineVerts = new Map<number, number>();
  const fineW = (nx - 1) * LAKE_SUBDIV + 1;
  const fineStep = step / LAKE_SUBDIV;
  const fineVert = (i: number, j: number, si: number, sj: number, heightVal: number) => {
    const fi = i * LAKE_SUBDIV + si, fj = j * LAKE_SUBDIV + sj;
    if (fi % LAKE_SUBDIV === 0 && fj % LAKE_SUBDIV === 0 && !carvedNodes!.has(fj * fineW + fi)) return coarseVert(fi / LAKE_SUBDIV, fj / LAKE_SUBDIV);
    const key = fj * fineW + fi;
    let vIdx = fineVerts.get(key);
    if (vIdx !== undefined) return vIdx;
    vIdx = pos.length / 3;
    fineVerts.set(key, vIdx);
    pos.push(grid.x0 + fi * fineStep, LAND_Y + heightVal + liftInCell(i, j, si / LAKE_SUBDIV, sj / LAKE_SUBDIV), grid.z0 + fj * fineStep);
    const clr = coverColors[+cover[Math.round(fj / LAKE_SUBDIV) * nx + Math.round(fi / LAKE_SUBDIV)] || 0];
    col.push(clr.r, clr.g, clr.b);
    return vIdx;
  };

  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const idx = j * nx + i;
      if (h[idx] === 0 && h[idx + 1] === 0 && h[idx + nx] === 0 && h[idx + nx + 1] === 0) continue;
      const sub = fineCells!.get(idx);
      if (sub) {
        const subVert = (si: number, sj: number) => fineVert(i, j, si, sj, sub[sj * (LAKE_SUBDIV + 1) + si]);
        for (let sj = 0; sj < LAKE_SUBDIV; sj++) {
          for (let si = 0; si < LAKE_SUBDIV; si++) {
            const v0 = subVert(si, sj), v1 = subVert(si + 1, sj), v2 = subVert(si + 1, sj + 1), v3 = subVert(si, sj + 1);
            indices.push(v0, v2, v1, v0, v3, v2);
          }
        }
        continue;
      }
      const v0 = coarseVert(i, j), v1 = coarseVert(i + 1, j), v2 = coarseVert(i + 1, j + 1), v3 = coarseVert(i, j + 1);
      indices.push(v0, v2, v1, v0, v3, v2);
    }
  }
  if (!indices.length) return null;

  appendTerrainEdgeWalls(grid, liftAt, pos, col, indices);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = landMaterial(0xffffff, true);
  mat.vertexColors = true;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'terrain';
  return mesh;
}
