import { unflat, pathLength } from '../../geo/buf.ts';
import { rise } from '../../geo/terrain.ts';
import { LAND_Y, ROAD_MAX, roadWidth } from '../../config.ts';
import { TT_LENGTH } from '../truongtien.ts';
import { placeOwnsWay } from '../places/index.ts';
import { createPrng } from '../helpers.ts';

// Shared deterministic PRNG and polyline-path helpers for animated traffic, pedestrians, and trains.
export const rng = createPrng;

// ---------- shared helpers for things that move along polylines ----------

export const BRIDGE_TOP = LAND_Y + 0.42; // road bridge slab top (geo/city.js)
export const RAIL_BRIDGE_TOP = LAND_Y + 0.5; // rail bridge deck (geo/city.js)
export const ON_GROUND = 0.06; // things on the ground stand on the road overlay, not under it

const MIN_SEG_LEN = 1e-6;
const MIN_JOIN_COS = 0.25;
const DUPLICATE_PT_EPS = 0.05;
const TT_DECK_TOP = 6.4;
const TT_TRUSS_EDGE_INSET = 2.35;
const TT_RAMP_LEN = 34;
const TT_DEFAULT_REACH = 33;
const TT_RAMP_FOOT_LIFT = 0.08;
const TT_DECK_CLEARANCE = 0.04;

// Same as `along` in geo/city.js, so lamp posts land exactly where the night glows are.
export function along(pts, dist) {
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i];
    const ptB = pts[i + 1];
    const segLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (acc + segLen >= dist && segLen > 0) {
      const frac = (dist - acc) / segLen;
      return {
        p: [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac],
        a: Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]),
      };
    }
    acc += segLen;
  }
  const prevPt = pts[pts.length - 2];
  const lastPt = pts[pts.length - 1];
  return { p: lastPt, a: Math.atan2(lastPt[1] - prevPt[1], lastPt[0] - prevPt[0]) };
}

// Same as `widthAt` in geo/city.js, for tapering carriageways (r.ws).
export function widthAt(pts, widths, probe) {
  let bestDist = Infinity;
  let bestWidth = widths[0];
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i];
    const ptB = pts[i + 1];
    const dx = ptB[0] - ptA[0];
    const dz = ptB[1] - ptA[1];
    const lenSq = dx * dx + dz * dz;
    const param = lenSq ? Math.max(0, Math.min(1, ((probe[0] - ptA[0]) * dx + (probe[1] - ptA[1]) * dz) / lenSq)) : 0;
    const dist = Math.hypot(probe[0] - ptA[0] - param * dx, probe[1] - ptA[1] - param * dz);
    if (dist < bestDist) {
      bestDist = dist;
      bestWidth = widths[i] + (widths[i + 1] - widths[i]) * param;
    }
  }
  return bestWidth;
}

// The roads as objects, defensively: anything malformed is dropped.
export function readRoads(data) {
  const out = [];
  const isOwned = placeOwnsWay(data);
  for (const road of data.roads || []) {
    if (!Array.isArray(road) || !Array.isArray(road[2]) || road[2].length < 4 || isOwned(road)) continue;
    const pts = unflat(road[2]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const pt of pts) {
      if (pt[0] < x0) x0 = pt[0];
      if (pt[0] > x1) x1 = pt[0];
      if (pt[1] < z0) z0 = pt[1];
      if (pt[1] > z1) z1 = pt[1];
    }
    out.push({
      c: Math.max(0, Math.min(ROAD_MAX, road[0] | 0)),
      w: roadWidth(road),
      ...(road[4] ? { ws: road[4].map((val) => val / 10) } : {}),
      bridge: !!road[1],
      flat: road[2],
      pts,
      len: pathLength(pts),
      ...(road[5] > 0 ? { unmarked: true } : {}),
      x0, x1, z0, z1,
    });
  }
  return out;
}

// A walkable/drivable path. ya/yb[i] are the heights at the two ends of segment i (pts[i-1] → pts[i]);
// NaN means "on the ground", which is then read from the terrain under the offset position.
export function mkPath(pts, ya = null, yb = null) {
  const count = pts.length;
  const acc = new Float64Array(count);
  const ux = new Float32Array(count);
  const uz = new Float32Array(count);
  for (let i = 1; i < count; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dz = pts[i][1] - pts[i - 1][1];
    const segLen = Math.hypot(dx, dz);
    acc[i] = acc[i - 1] + segLen;
    ux[i] = segLen > MIN_SEG_LEN ? dx / segLen : NaN;
    uz[i] = segLen > MIN_SEG_LEN ? dz / segLen : 0;
  }
  // a zero-length segment borrows its neighbour's direction
  for (let i = 2; i < count; i++) if (ux[i] !== ux[i]) { ux[i] = ux[i - 1]; uz[i] = uz[i - 1]; }
  for (let i = count - 2; i >= 1; i--) if (ux[i] !== ux[i]) { ux[i] = ux[i + 1]; uz[i] = uz[i + 1]; }
  for (let i = 1; i < count; i++) if (ux[i] !== ux[i]) { ux[i] = 1; uz[i] = 0; }
  return { pts, acc, ux, uz, len: acc[count - 1], ya, yb } as Record<string, any>;
}

export function seek(path, arcPos, seg) {
  const acc = path.acc;
  const count = acc.length;
  if (seg < 1) seg = 1;
  else if (seg > count - 1) seg = count - 1;
  while (seg < count - 1 && acc[seg] < arcPos) seg++;
  while (seg > 1 && acc[seg - 1] > arcPos) seg--;
  return seg;
}

// Position at arc length arcPos, pushed `off` metres to the right of the direction of travel along the path.
// Near a corner the direction is blended with the neighbouring segment's, so offset agents round the corner
// instead of jumping across it. Writes into `out`.
export function place(path, arcPos, seg, off, out) {
  const ptA = path.pts[seg - 1];
  const ptB = path.pts[seg];
  const acc = path.acc;
  const count = acc.length;
  const segLen = acc[seg] - acc[seg - 1];
  let frac = segLen > MIN_SEG_LEN ? (arcPos - acc[seg - 1]) / segLen : 0;
  if (frac < 0) frac = 0;
  else if (frac > 1) frac = 1;

  let dx = path.ux[seg];
  let dz = path.uz[seg];
  const cornerRadius = Math.min(Math.abs(off) * 1.5 + 1, segLen / 2);
  const distFromStart = frac * segLen;
  const distToEnd = segLen - distFromStart;
  if (distFromStart >= distToEnd) {
    if (distToEnd < cornerRadius && seg < count - 1) {
      const blend = 0.5 * (1 - distToEnd / cornerRadius);
      dx += (path.ux[seg + 1] - dx) * blend;
      dz += (path.uz[seg + 1] - dz) * blend;
    }
  } else if (distFromStart < cornerRadius && seg > 1) {
    const blend = 0.5 * (1 - distFromStart / cornerRadius);
    dx += (path.ux[seg - 1] - dx) * blend;
    dz += (path.uz[seg - 1] - dz) * blend;
  }

  out.dx = dx;
  out.dz = dz;
  out.x = ptA[0] + (ptB[0] - ptA[0]) * frac - dz * off;
  out.z = ptA[1] + (ptB[1] - ptA[1]) * frac + dx * off;
  const ya = path.ya ? path.ya[seg] : NaN;
  const groundY = LAND_Y + rise(out.x, out.z) + ON_GROUND;
  // a deck never sinks below the ground (bridges over hill streams are mapped as bridges too)
  out.y = ya === ya ? Math.max(groundY, ya + (path.yb[seg] - ya) * frac) : groundY;
  return out;
}

function buildEndpointGrid(lines, tol) {
  const cell = (val) => Math.round(val / tol);
  const grid = new Map();
  lines.forEach((line, lineIdx) => {
    for (let end = 0; end < 2; end++) {
      const pt = end ? line.pts[line.pts.length - 1] : line.pts[0];
      const key = cell(pt[0]) + ',' + cell(pt[1]);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(lineIdx * 2 + end);
    }
  });
  return { grid, cell };
}

function findBestContinuation(lines, used, grid, cell, seedIdx, lastLink, tol, canJoin) {
  const lastPts = lines[lastLink.idx].pts;
  const lastCount = lastPts.length;
  const tail = lastLink.rev ? lastPts[0] : lastPts[lastCount - 1];
  const prev = lastLink.rev ? lastPts[1] : lastPts[lastCount - 2];
  const dirLen = Math.hypot(tail[0] - prev[0], tail[1] - prev[1]) || 1;
  const dirX = (tail[0] - prev[0]) / dirLen;
  const dirZ = (tail[1] - prev[1]) / dirLen;

  let best = null;
  let bestScore = MIN_JOIN_COS;
  const gx = cell(tail[0]);
  const gz = cell(tail[1]);
  for (let ox = -1; ox <= 1; ox++) {
    for (let oz = -1; oz <= 1; oz++) {
      const bucket = grid.get(gx + ox + ',' + (gz + oz));
      if (!bucket) continue;
      for (const code of bucket) {
        const candIdx = code >> 1;
        const end = code & 1;
        if (used[candIdx] || !canJoin(lines[seedIdx], lines[candIdx])) continue;
        const candPts = lines[candIdx].pts;
        const candCount = candPts.length;
        const head = end ? candPts[candCount - 1] : candPts[0];
        const next = end ? candPts[candCount - 2] : candPts[1];
        if (Math.hypot(head[0] - tail[0], head[1] - tail[1]) > tol) continue;
        const candLen = Math.hypot(next[0] - head[0], next[1] - head[1]) || 1;
        const score = (dirX * (next[0] - head[0]) + dirZ * (next[1] - head[1])) / candLen;
        if (score > bestScore) { bestScore = score; best = { idx: candIdx, rev: end === 1 }; }
      }
    }
  }
  return best;
}

function assembleChainedPath(lines, seq, seedIdx, tol) {
  const pts = [];
  const ya = [];
  const yb = [];
  const halfWidths = [];
  for (const link of seq) {
    const line = lines[link.idx];
    const linePts = line.pts;
    const count = linePts.length;
    const heightAt = (k) => (line.hs ? line.hs[link.rev ? count - 1 - k : k] : line.h);
    const halfW = line.w ? line.w / 2 : 0;
    let lastH = heightAt(0);
    for (let k = 0; k < count; k++) {
      const pt = link.rev ? linePts[count - 1 - k] : linePts[k];
      const height = heightAt(k);
      if (pts.length) {
        const prevPt = pts[pts.length - 1];
        if (Math.hypot(pt[0] - prevPt[0], pt[1] - prevPt[1]) < (k === 0 ? tol + 0.01 : DUPLICATE_PT_EPS)) {
          if (k === 0) lastH = height;
          continue;
        }
      }
      const hasDeck = k > 0 && lastH === lastH && height === height;
      pts.push(pt);
      ya.push(hasDeck ? lastH : NaN);
      yb.push(hasDeck ? height : NaN);
      halfWidths.push(halfW);
      lastH = height;
    }
  }
  if (pts.length < 2) return null;
  const path = mkPath(pts, Float32Array.from(ya), Float32Array.from(yb));
  path.hw = Float32Array.from(halfWidths);
  path.c = lines[seedIdx].c;
  return path;
}

// Join polylines whose ends meet into longer paths, preferring the straightest continuation.
// lines: [{ pts, h, len, c }] where h is the deck height of the whole line (NaN on the ground).
export function chain(lines, tol, canJoin) {
  const { grid, cell } = buildEndpointGrid(lines, tol);
  const used = new Uint8Array(lines.length);
  const order = lines.map((_, idx) => idx).sort((idxA, idxB) => lines[idxB].len - lines[idxA].len);
  const out = [];
  for (const seedIdx of order) {
    if (used[seedIdx]) continue;
    used[seedIdx] = 1;
    let seq = [{ idx: seedIdx, rev: false }];
    for (let pass = 0; pass < 2; pass++) {
      for (;;) {
        const best = findBestContinuation(lines, used, grid, cell, seedIdx, seq[seq.length - 1], tol, canJoin);
        if (!best) break;
        used[best.idx] = 1;
        seq.push(best);
      }
      if (pass === 0) seq = seq.reverse().map((link) => ({ idx: link.idx, rev: !link.rev }));
    }
    const path = assembleChainedPath(lines, seq, seedIdx, tol);
    if (path) out.push(path);
  }
  return out;
}

// Cut a polyline into the runs that satisfy keep(x, z), sampled every `step` metres.
export function clipRuns(pts, keep, step, minLen) {
  const runs = [];
  let cur = [];
  const flush = () => { if (cur.length >= 2 && pathLength(cur) >= minLen) runs.push(cur); cur = []; };
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i];
    const ptB = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) / step));
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const x = ptA[0] + ((ptB[0] - ptA[0]) * k) / steps;
      const z = ptA[1] + ((ptB[1] - ptA[1]) * k) / steps;
      if (keep(x, z)) cur.push([x, z]);
      else flush();
    }
  }
  flush();
  return runs;
}

export function placeById(data) {
  const map = new Map();
  for (const placeItem of data.places || []) {
    if (placeItem && placeItem.id && Number.isFinite(placeItem.x) && Number.isFinite(placeItem.z)) {
      map.set(placeItem.id, [placeItem.x / 10, placeItem.z / 10]);
    }
  }
  return map;
}

// Cầu Trường Tiền's deck, rebuilt from the same numbers as landmarks/truongtien.js (deck top 6.4 m above the river,
// 34 m ramps at each end, walkways cantilevered outside the trusses).
export function truongTienFrame(data) {
  const truongTien = data.truongtien;
  if (!truongTien || !truongTien.a || !truongTien.b || !truongTien.box || !truongTien.box.c) return null;
  const endA = [truongTien.a[0] / 10, truongTien.a[1] / 10];
  const endB = [truongTien.b[0] / 10, truongTien.b[1] / 10];
  const spanLen = Math.hypot(endB[0] - endA[0], endB[1] - endA[1]);
  if (!(spanLen > 1)) return null;
  const dir = [(endB[0] - endA[0]) / spanLen, (endB[1] - endA[1]) / spanLen];
  const normal = [-dir[1], dir[0]];
  const center = [truongTien.box.c[0] / 10, truongTien.box.c[1] / 10];
  const deckLen = TT_LENGTH;
  const deckW = truongTien.box.d / 10;
  const trussX = deckW / 2 - TT_TRUSS_EDGE_INSET;
  const at = (alongPos, off) => [center[0] + dir[0] * alongPos + normal[0] * off, center[1] + dir[1] * alongPos + normal[1] * off];
  const lane = (off, dy, reach = TT_DEFAULT_REACH) => {
    const footY = TT_DECK_TOP + (LAND_Y + TT_RAMP_FOOT_LIFT - TT_DECK_TOP) * (reach / TT_RAMP_LEN);
    const pts = [at(-deckLen / 2 - reach, off), at(-deckLen / 2, off), at(deckLen / 2, off), at(deckLen / 2 + reach, off)];
    const ya = Float32Array.from([NaN, footY + TT_DECK_CLEARANCE, TT_DECK_TOP + dy, TT_DECK_TOP + TT_DECK_CLEARANCE]);
    const yb = Float32Array.from([NaN, TT_DECK_TOP + TT_DECK_CLEARANCE, TT_DECK_TOP + dy, footY + TT_DECK_CLEARANCE]);
    return mkPath(pts, ya, yb);
  };
  return { L: deckLen, W: deckW, d: dir, n: normal, c: center, deckTop: TT_DECK_TOP, trussX, walkOff: trussX + (deckW / 2 - trussX) / 2, lane };
}

export const tmp = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };
