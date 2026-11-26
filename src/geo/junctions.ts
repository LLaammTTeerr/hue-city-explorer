// Junctions: where carriageways meet, the junction box is plain asphalt.
// junctionHoles() finds enclosed patches; markingGuard() says where a road's markings may run;
// slivers() finds narrow unwalkable pavement strips; asphaltTest() checks if a point sits on asphalt.
import { CellGrid } from './cellgrid.ts';

export const HOLE_MAX = 150; // m²: an enclosed patch smaller than this is part of the junction, not an island
export const ISLAND_MIN = 10; // m²: an enclosed patch beside a slip road is a traffic island from this size up
export const MARK_PAD = 1.5; // m: markings stop this far short of another carriageway
export const CELL = 0.5; // m: the raster the holes are found on
export const PAR_DEG = 30; // a way within this of parallel to a marking runs alongside it, it doesn't cross it
export const SLIVER = 2.5; // m

const LINK_DIST_M = 30;
const WINDOW_REACH_M = 10;
const TRI_GRID_M = 32;
const MARK_GRID_M = 24;
const SLIVER_GRID_M = 24;
const ASPHALT_GRID_M = 8;
const MAX_WINDOW_CELLS = 4e6;
const PAR_SIN = Math.sin((PAR_DEG * Math.PI) / 180);
const CONT_COS = Math.cos((40 * Math.PI) / 180);
const cellKey = (ix: number, iz: number) => ix * 1048576 + iz;
const pointKey = (pt: number[]) => `${Math.round(pt[0] * 2)},${Math.round(pt[1] * 2)}`;

interface TriEntry {
  t: [number[], number[], number[]];
  c: number;
  u: boolean;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  stamp: number;
}

function indexCarriagewayTriangles(carriageways: any[]) {
  const grid = new Map<number, TriEntry[]>();
  for (const road of carriageways) {
    const { L, R } = road;
    for (let i = 0; i + 1 < L.length; i++) {
      const tris: [number[], number[], number[]][] = [[L[i], R[i], R[i + 1]], [L[i], R[i + 1], L[i + 1]]];
      for (const tri of tris) {
        const x0 = Math.min(tri[0][0], tri[1][0], tri[2][0]);
        const x1 = Math.max(tri[0][0], tri[1][0], tri[2][0]);
        const z0 = Math.min(tri[0][1], tri[1][1], tri[2][1]);
        const z1 = Math.max(tri[0][1], tri[1][1], tri[2][1]);
        const entry: TriEntry = { t: tri, c: road.c, u: !!road.u, x0, x1, z0, z1, stamp: -1 };
        for (let gx = Math.floor(x0 / TRI_GRID_M); gx <= Math.floor(x1 / TRI_GRID_M); gx++) {
          for (let gz = Math.floor(z0 / TRI_GRID_M); gz <= Math.floor(z1 / TRI_GRID_M); gz++) {
            const key = cellKey(gx, gz);
            const list = grid.get(key);
            if (list) list.push(entry); else grid.set(key, [entry]);
          }
        }
      }
    }
  }
  return grid;
}

function clusterJunctionNodes(carriageways: any[]) {
  const degree = new Map<string, number>();
  const nodePos = new Map<string, number[]>();
  for (const road of carriageways) {
    road.pts.forEach((pt: number[], idx: number) => {
      const key = pointKey(pt);
      degree.set(key, (degree.get(key) || 0) + (idx === 0 || idx === road.pts.length - 1 ? 1 : 2));
      nodePos.set(key, pt);
    });
  }
  const nodes = [...degree].filter(([, deg]) => deg >= 3).map(([key]) => nodePos.get(key)!);
  const parent = nodes.map((_, idx) => idx);
  const findRoot = (idx: number) => { while (parent[idx] !== idx) idx = parent[idx] = parent[parent[idx]]; return idx; };

  const nodeGrid = new Map<string, number[]>();
  nodes.forEach((pt, idx) => {
    const key = `${Math.floor(pt[0] / LINK_DIST_M)},${Math.floor(pt[1] / LINK_DIST_M)}`;
    if (!nodeGrid.has(key)) nodeGrid.set(key, []);
    nodeGrid.get(key)!.push(idx);
  });
  nodes.forEach((pt, idx) => {
    const gx = Math.floor(pt[0] / LINK_DIST_M), gz = Math.floor(pt[1] / LINK_DIST_M);
    for (let ox = gx - 1; ox <= gx + 1; ox++) {
      for (let oz = gz - 1; oz <= gz + 1; oz++) {
        for (const other of nodeGrid.get(`${ox},${oz}`) || []) {
          if (other < idx && Math.hypot(nodes[other][0] - pt[0], nodes[other][1] - pt[1]) < LINK_DIST_M) {
            parent[findRoot(other)] = findRoot(idx);
          }
        }
      }
    }
  });
  const clusters = new Map<number, number[][]>();
  nodes.forEach((pt, idx) => {
    const root = findRoot(idx);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(pt);
  });
  return clusters;
}

export function junctionHoles(carriageways: any[], skip: ((x: number, z: number) => boolean) | null = null) {
  const triGrid = indexCarriagewayTriangles(carriageways);
  const clusters = clusterJunctionNodes(carriageways);

  const holes: any[] = [];
  const cells = new Set<number>();
  const maxCells = HOLE_MAX / (CELL * CELL);
  let mask = new Uint8Array(0);
  let roadCls = mask;
  let slipMask = mask;
  let queue = new Int32Array(0);
  let stamp = 0;

  for (const clusterPts of clusters.values()) {
    if (clusterPts.length < 2) continue;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const pt of clusterPts) {
      x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]);
      z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]);
    }
    const i0 = Math.floor((x0 - WINDOW_REACH_M) / CELL);
    const j0 = Math.floor((z0 - WINDOW_REACH_M) / CELL);
    const width = Math.ceil((x1 + WINDOW_REACH_M) / CELL) - i0 + 1;
    const height = Math.ceil((z1 + WINDOW_REACH_M) / CELL) - j0 + 1;
    const cellCount = width * height;
    if (cellCount > MAX_WINDOW_CELLS) continue;
    if (mask.length < cellCount) {
      mask = new Uint8Array(cellCount * 2);
      roadCls = new Uint8Array(cellCount * 2);
      slipMask = new Uint8Array(cellCount * 2);
      queue = new Int32Array(cellCount * 2);
    }
    mask.fill(0, 0, cellCount); // 0 open, 1 carriageway, 2 reached from outside, 3 enclosed
    roadCls.fill(9, 0, cellCount);
    slipMask.fill(0, 0, cellCount);
    stamp++;

    for (let gx = Math.floor((i0 * CELL) / TRI_GRID_M); gx <= Math.floor(((i0 + width) * CELL) / TRI_GRID_M); gx++) {
      for (let gz = Math.floor((j0 * CELL) / TRI_GRID_M); gz <= Math.floor(((j0 + height) * CELL) / TRI_GRID_M); gz++) {
        for (const tri of triGrid.get(cellKey(gx, gz)) || []) {
          if (tri.stamp === stamp) continue;
          tri.stamp = stamp;
          rasterizeTri(tri, mask, roadCls, slipMask, i0, j0, width, height);
        }
      }
    }

    let qHead = 0, qTail = 0;
    const pushOpen = (idx: number) => { if (mask[idx] === 0) { mask[idx] = 2; queue[qTail++] = idx; } };
    for (let i = 0; i < width; i++) { pushOpen(i); pushOpen((height - 1) * width + i); }
    for (let j = 0; j < height; j++) { pushOpen(j * width); pushOpen(j * width + width - 1); }
    while (qHead < qTail) {
      const idx = queue[qHead++], col = idx % width;
      if (col > 0) pushOpen(idx - 1);
      if (col < width - 1) pushOpen(idx + 1);
      if (idx >= width) pushOpen(idx - width);
      if (idx < (height - 1) * width) pushOpen(idx + width);
    }

    for (let startIdx = 0; startIdx < cellCount; startIdx++) {
      if (mask[startIdx] !== 0) continue;
      const patch: number[] = [];
      let minCls = 9;
      let touchesSlip = false;
      mask[startIdx] = 3; queue[0] = startIdx; qHead = 0; qTail = 1;
      const visit = (nextIdx: number) => {
        if (mask[nextIdx] === 0) { mask[nextIdx] = 3; queue[qTail++] = nextIdx; }
        else if (mask[nextIdx] === 1) { if (roadCls[nextIdx] < minCls) minCls = roadCls[nextIdx]; if (slipMask[nextIdx]) touchesSlip = true; }
      };
      while (qHead < qTail) {
        const idx = queue[qHead++], col = idx % width;
        patch.push(idx);
        if (col > 0) visit(idx - 1);
        if (col < width - 1) visit(idx + 1);
        if (idx >= width) visit(idx - width);
        if (idx < (height - 1) * width) visit(idx + width);
      }
      if (patch.length > maxCells || (touchesSlip && patch.length * CELL * CELL >= ISLAND_MIN)) continue;
      let sumI = 0, sumJ = 0;
      const patchCells = patch.map((idx) => {
        const ci = i0 + (idx % width), cj = j0 + ((idx / width) | 0);
        sumI += ci; sumJ += cj;
        return [ci, cj];
      });
      if (cells.has(cellKey(patchCells[0][0], patchCells[0][1]))) continue;
      const cx = (sumI / patchCells.length + 0.5) * CELL;
      const cz = (sumJ / patchCells.length + 0.5) * CELL;
      if (skip && skip(cx, cz)) continue;
      for (const [ci, cj] of patchCells) cells.add(cellKey(ci, cj));
      holes.push({ cells: patchCells, c: minCls, x: cx, z: cz, area: patchCells.length * CELL * CELL });
    }
  }
  return { holes, cells };
}

function rasterizeTri(tri: TriEntry, mask: Uint8Array, roadCls: Uint8Array, slipMask: Uint8Array, i0: number, j0: number, width: number, height: number) {
  const [p0, p1, p2] = tri.t;
  const area2 = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
  if (Math.abs(area2) < 1e-6) return;
  const sign = area2 > 0 ? 1 : -1;
  const minI = Math.max(0, Math.floor(tri.x0 / CELL) - i0);
  const maxI = Math.min(width - 1, Math.ceil(tri.x1 / CELL) - i0);
  const minJ = Math.max(0, Math.floor(tri.z0 / CELL) - j0);
  const maxJ = Math.min(height - 1, Math.ceil(tri.z1 / CELL) - j0);
  for (let j = minJ; j <= maxJ; j++) {
    const z = (j0 + j + 0.5) * CELL;
    for (let i = minI; i <= maxI; i++) {
      const x = (i0 + i + 0.5) * CELL;
      if (((p1[0] - p0[0]) * (z - p0[1]) - (p1[1] - p0[1]) * (x - p0[0])) * sign < 0) continue;
      if (((p2[0] - p1[0]) * (z - p1[1]) - (p2[1] - p1[1]) * (x - p1[0])) * sign < 0) continue;
      if (((p0[0] - p2[0]) * (z - p2[1]) - (p0[1] - p2[1]) * (x - p2[0])) * sign < 0) continue;
      const idx = j * width + i;
      mask[idx] = 1;
      if (tri.u) slipMask[idx] = 1;
      if (tri.c < roadCls[idx]) roadCls[idx] = tri.c;
    }
  }
}

export function nearHole(cells: Set<number>, x: number, z: number, pad = 0) {
  const radius = Math.ceil(pad / CELL);
  const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
  for (let di = -radius; di <= radius; di++) {
    for (let dj = -radius; dj <= radius; dj++) if (cells.has(cellKey(ci + di, cj + dj))) return true;
  }
  return false;
}

export function holeRects(hole: { cells: [number, number][] }) {
  const rows = new Map<number, Set<number>>();
  for (const [ci, cj] of hole.cells) {
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const row = cj + dj;
        if (!rows.has(row)) rows.set(row, new Set());
        rows.get(row)!.add(ci + di);
      }
    }
  }
  const rects: [number, number, number, number][] = [];
  for (const [row, cols] of rows) {
    const xs = [...cols].sort((a, b) => a - b);
    for (let idx = 0; idx < xs.length;) {
      let endIdx = idx;
      while (endIdx + 1 < xs.length && xs[endIdx + 1] === xs[endIdx] + 1) endIdx++;
      rects.push([xs[idx] * CELL, (xs[endIdx] + 1) * CELL, row * CELL, (row + 1) * CELL]);
      idx = endIdx + 1;
    }
  }
  return rects;
}

export function inPoly(ring: number[][], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p0 = ring[i], p1 = ring[j];
    if ((p0[1] > z) !== (p1[1] > z) && x < ((p1[0] - p0[0]) * (z - p0[1])) / (p1[1] - p0[1]) + p0[0]) inside = !inside;
  }
  return inside;
}

export function continues(ptsA: number[][], ptsB: number[][]) {
  for (const [endA, prevA] of [[ptsA[0], ptsA[1]], [ptsA.at(-1)!, ptsA.at(-2)!]]) {
    for (const [endB, nextB] of [[ptsB[0], ptsB[1]], [ptsB.at(-1)!, ptsB.at(-2)!]]) {
      if (Math.hypot(endA[0] - endB[0], endA[1] - endB[1]) > 0.3) continue;
      const ux = endA[0] - prevA[0], uz = endA[1] - prevA[1];
      const vx = nextB[0] - endB[0], vz = nextB[1] - endB[1];
      const denom = Math.hypot(ux, uz) * Math.hypot(vx, vz);
      if (denom > 0 && (ux * vx + uz * vz) / denom > CONT_COS) return true;
    }
  }
  return false;
}

export function markingGuard(roads: any[], holeCells: Set<number> | null = null) {
  const segGrid = new Map<string, any[]>();
  const endpoints = new Map<string, any[]>();
  for (const road of roads) {
    for (const pt of [road.pts[0], road.pts.at(-1)]) {
      const key = pointKey(pt);
      if (!endpoints.has(key)) endpoints.set(key, []);
      endpoints.get(key)!.push(road);
    }
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const halfW = (road.ws ? Math.max(road.ws[i], road.ws[i + 1]) : road.w) / 2 + MARK_PAD;
      const p0 = road.pts[i], p1 = road.pts[i + 1];
      const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
      const seg = { r: road, a: p0, b: p1, hw: halfW, ux: (p1[0] - p0[0]) / segLen, uz: (p1[1] - p0[1]) / segLen };
      for (let gx = Math.floor((Math.min(p0[0], p1[0]) - halfW) / MARK_GRID_M); gx <= Math.floor((Math.max(p0[0], p1[0]) + halfW) / MARK_GRID_M); gx++) {
        for (let gz = Math.floor((Math.min(p0[1], p1[1]) - halfW) / MARK_GRID_M); gz <= Math.floor((Math.max(p0[1], p1[1]) + halfW) / MARK_GRID_M); gz++) {
          const key = `${gx},${gz}`;
          if (!segGrid.has(key)) segGrid.set(key, []);
          segGrid.get(key)!.push(seg);
        }
      }
    }
  }
  const continuations = new Map<number, Set<number>>();
  const continuationsOf = (road: any) => {
    if (!continuations.has(road.id)) {
      const set = new Set<number>();
      for (const pt of [road.pts[0], road.pts.at(-1)]) {
        for (const other of endpoints.get(pointKey(pt)) || []) {
          if (other !== road && continues(road.pts, other.pts)) set.add(other.id);
        }
      }
      continuations.set(road.id, set);
    }
    return continuations.get(road.id)!;
  };
  const byId = new Map(roads.map((road) => [road.id, road]));
  const emptySet = new Set<number>();

  return (id: number, x: number, z: number, ang: number | null = null) => {
    const ux = ang === null ? 0 : Math.cos(ang), uz = ang === null ? 0 : Math.sin(ang);
    if (holeCells && nearHole(holeCells, x, z, MARK_PAD)) return false;
    const self = byId.get(id);
    const ownCont = self ? continuationsOf(self) : emptySet;
    for (const seg of segGrid.get(`${Math.floor(x / MARK_GRID_M)},${Math.floor(z / MARK_GRID_M)}`) || []) {
      if (seg.r.id === id || ownCont.has(seg.r.id)) continue;
      if (ang !== null && Math.abs(ux * seg.uz - uz * seg.ux) < PAR_SIN) continue;
      const dx = seg.b[0] - seg.a[0], dz = seg.b[1] - seg.a[1], lenSq = dx * dx + dz * dz;
      const frac = lenSq ? Math.max(0, Math.min(1, ((x - seg.a[0]) * dx + (z - seg.a[1]) * dz) / lenSq)) : 0;
      if (Math.hypot(x - seg.a[0] - frac * dx, z - seg.a[1] - frac * dz) < seg.hw) return false;
    }
    return true;
  };
}

export function slivers(roads: any[]) {
  const segGrid = new Map<string, any[]>();
  roads.forEach((road, id) => {
    for (let i = 0; i + 1 < road.pts.length; i++) {
      const p0 = road.pts[i], p1 = road.pts[i + 1];
      const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (segLen < 1e-6) continue;
      const seg = { id, a: p0, b: p1, L: segLen, tx: (p1[0] - p0[0]) / segLen, tz: (p1[1] - p0[1]) / segLen };
      const pad = road.w / 2 + 10;
      for (let gx = Math.floor((Math.min(p0[0], p1[0]) - pad) / SLIVER_GRID_M); gx <= Math.floor((Math.max(p0[0], p1[0]) + pad) / SLIVER_GRID_M); gx++) {
        for (let gz = Math.floor((Math.min(p0[1], p1[1]) - pad) / SLIVER_GRID_M); gz <= Math.floor((Math.max(p0[1], p1[1]) + pad) / SLIVER_GRID_M); gz++) {
          const key = `${gx},${gz}`;
          if (!segGrid.has(key)) segGrid.set(key, []);
          segGrid.get(key)!.push(seg);
        }
      }
    }
  });

  const strips: any[] = [];
  roads.forEach((roadA, idxA) => {
    const sideRuns: any[][] = [[], []];
    const flushSide = (side: number) => {
      const run = sideRuns[side];
      if (run.length >= 2) strips.push({ pts: run.map((sample) => sample.p), ws: run.map((sample) => sample.w), c: Math.min(roadA.c, roads[run[0].b].c) });
      sideRuns[side] = [];
    };
    for (let i = 0; i + 1 < roadA.pts.length; i++) {
      const p0 = roadA.pts[i], p1 = roadA.pts[i + 1];
      const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (segLen < 1e-6) continue;
      const tx = (p1[0] - p0[0]) / segLen, tz = (p1[1] - p0[1]) / segLen;
      for (let step = i ? 1 : 0; step <= Math.floor(segLen); step++) {
        const px = p0[0] + tx * step, pz = p0[1] + tz * step;
        const bestPerSide: any[] = [null, null];
        for (const seg of segGrid.get(`${Math.floor(px / SLIVER_GRID_M)},${Math.floor(pz / SLIVER_GRID_M)}`) || []) {
          if (seg.id === idxA || Math.abs(tx * seg.tz - tz * seg.tx) > PAR_SIN) continue;
          const proj = Math.max(0, Math.min(seg.L, (px - seg.a[0]) * seg.tx + (pz - seg.a[1]) * seg.tz));
          const qx = seg.a[0] + seg.tx * proj, qz = seg.a[1] + seg.tz * proj;
          const dist = Math.hypot(qx - px, qz - pz);
          const gap = dist - roadA.w / 2 - roads[seg.id].w / 2;
          if (dist < 1e-6 || gap < -0.3 || gap >= SLIVER) continue;
          if (Math.abs(((qx - px) * tx + (qz - pz) * tz) / dist) > 0.35) continue;
          const side = tx * (qz - pz) - tz * (qx - px) > 0 ? 1 : 0;
          if (!bestPerSide[side] || gap < bestPerSide[side].gap) {
            bestPerSide[side] = { b: seg.id, gap, nx: (qx - px) / dist, nz: (qz - pz) / dist };
          }
        }
        for (const side of [0, 1]) {
          const hit = bestPerSide[side];
          if (!hit || hit.b < idxA || (sideRuns[side].length && sideRuns[side][0].b !== hit.b)) {
            flushSide(side);
            if (!hit || hit.b < idxA) continue;
          }
          const midOff = roadA.w / 2 + hit.gap / 2;
          sideRuns[side].push({ b: hit.b, p: [px + hit.nx * midOff, pz + hit.nz * midOff], w: Math.max(0.3, hit.gap + 0.6) });
        }
      }
    }
    flushSide(0);
    flushSide(1);
  });
  return strips;
}

export function asphaltTest(ribbons: { L: number[][]; R: number[][] }[], holeCells: Set<number>) {
  const triGrid = new Map<number, [number[], number[], number[]][]>();
  const coarse = new CellGrid();
  const invShift = 1 / 1048576;
  const cellsPerCoarse = ASPHALT_GRID_M / CELL; // 16 half-metre cells per 8 m coarse cell
  for (const key of holeCells) {
    const ci = Math.round(key * invShift);
    const cj = key - ci * 1048576;
    coarse.set(Math.floor(ci / cellsPerCoarse), Math.floor(cj / cellsPerCoarse), 2);
  }
  for (const { L, R } of ribbons) {
    for (let i = 0; i + 1 < L.length; i++) {
      const tris: [number[], number[], number[]][] = [[L[i], R[i], R[i + 1]], [L[i], R[i + 1], L[i + 1]]];
      for (const tri of tris) {
        const p0 = tri[0], p1 = tri[1], p2 = tri[2];
        const minX = p0[0] < p1[0] ? (p0[0] < p2[0] ? p0[0] : p2[0]) : (p1[0] < p2[0] ? p1[0] : p2[0]);
        const maxX = p0[0] > p1[0] ? (p0[0] > p2[0] ? p0[0] : p2[0]) : (p1[0] > p2[0] ? p1[0] : p2[0]);
        const minZ = p0[1] < p1[1] ? (p0[1] < p2[1] ? p0[1] : p2[1]) : (p1[1] < p2[1] ? p1[1] : p2[1]);
        const maxZ = p0[1] > p1[1] ? (p0[1] > p2[1] ? p0[1] : p2[1]) : (p1[1] > p2[1] ? p1[1] : p2[1]);
        for (let gx = Math.floor(minX / ASPHALT_GRID_M); gx <= Math.floor(maxX / ASPHALT_GRID_M); gx++) {
          for (let gz = Math.floor(minZ / ASPHALT_GRID_M); gz <= Math.floor(maxZ / ASPHALT_GRID_M); gz++) {
            coarse.set(gx, gz, 1);
            const key = cellKey(gx, gz);
            const bucket = triGrid.get(key);
            if (bucket) bucket.push(tri); else triGrid.set(key, [tri]);
          }
        }
      }
    }
  }
  const inTri = ([p0, p1, p2]: [number[], number[], number[]], x: number, z: number) => {
    const d1 = (p1[0] - p0[0]) * (z - p0[1]) - (p1[1] - p0[1]) * (x - p0[0]);
    const d2 = (p2[0] - p1[0]) * (z - p1[1]) - (p2[1] - p1[1]) * (x - p1[0]);
    const d3 = (p0[0] - p2[0]) * (z - p2[1]) - (p0[1] - p2[1]) * (x - p2[0]);
    return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
  };
  const test = ((x: number, z: number) => {
    const gx = Math.floor(x / ASPHALT_GRID_M), gz = Math.floor(z / ASPHALT_GRID_M);
    const flags = coarse.get(gx, gz);
    if (!flags) return false;
    if ((flags & 2) && holeCells.has(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)))) return true;
    if (flags & 1) {
      const bucket = triGrid.get(cellKey(gx, gz));
      if (bucket) {
        for (let i = 0; i < bucket.length; i++) if (inTri(bucket[i], x, z)) return true;
      }
    }
    return false;
  }) as ((x: number, z: number) => boolean) & { near: (x: number, z: number, r: number) => boolean };

  test.near = (x: number, z: number, r: number) => {
    const gx0 = Math.floor((x - r) / ASPHALT_GRID_M), gx1 = Math.floor((x + r) / ASPHALT_GRID_M);
    const gz0 = Math.floor((z - r) / ASPHALT_GRID_M), gz1 = Math.floor((z + r) / ASPHALT_GRID_M);
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gz = gz0; gz <= gz1; gz++) {
        if (coarse.get(gx, gz)) return true;
      }
    }
    return false;
  };
  return test;
}
