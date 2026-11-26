import * as THREE from 'three';
import { Buf, KIND, hex, shade, unflat, pathLength, rand, pick } from './buf.ts';
import { cityMaterial, glowPoints } from './materials.ts';
import { LAND_Y, PAL, ROAD_W, ROAD_MAX, roadWidth } from '../config.ts';
import { rise, drape } from './terrain.ts';
import { pavilion } from '../landmarks/citadel.ts';
import { bridgeProfiles, bridgeLamps, resample, subPath, LAND_RAMP, ownLit } from './bridges.ts';
import { bridgeJoints, handDeckJoints } from './joints.ts';
import { citadelBridge } from './citadel-bridge.ts';
import { thuyTienBridgeRoads } from '../landmarks/thuytien.ts';
import { replaced, placeDeckEnds, placeOwnsWay, placeClearings } from '../landmarks/places/index.ts';
import { ownRoads as giaHoiRoads } from '../landmarks/places/giahoi.ts';
import { ownRoads as daVienRoads } from '../landmarks/places/bachho.ts';
import { ownRoads as minhMangRoads } from '../landmarks/places/minhmang.ts';
import { junctionHoles, holeRects, markingGuard, inPoly, slivers } from './junctions.ts';

const DECIMETRES_PER_METRE = 10;
const ROAD_BASE_Y_OFFSET = 0.05;
const DRAPE_LIFT_M = 0.12;
const MITER_MIN_COS = 0.55;
const SNAP_MIN_SEG_M = 0.5;
const SNAP_MIN_DOT = 0.3;
const SNAP_MAX_EXTEND_M = 8;
const SNAP_MIN_RETRACT_MARGIN_M = 0.3;
const LANE_OVERLAY_EPS_M = 0.012;
const LANDING_TILT_THRESHOLD_M = 0.1;

const PAVEMENT_ADD_MAJOR_M = 3.6;
const PAVEMENT_ADD_MINOR_M = 2.4;
const VERGE_EXTRA_M = 0.5;
const KERB_ADD_MAJOR_M = 0.56;
const KERB_ADD_MINOR_M = 0.44;
const DASH_LEN_M = 5;
const DASH_RHYTHM_M = 13;
const DASH_START_M = 4;
const DASH_SHORT_RUN_MIN_M = 7;
const DASH_WIDTH_M = 0.32;
const RAIL_BALLAST_MAIN_W = 5.4;
const RAIL_BALLAST_SIDE_W = 4;
const RAIL_TRACK_MAIN_W = 1.9;
const RAIL_TRACK_SIDE_W = 1.4;
const LAMP_STEP_PRIMARY_M = 30;
const LAMP_STEP_SECONDARY_M = 36;
const LAMP_HEIGHT_M = 7.5;
const LAMP_GLOW_SIZE = 7;
const LAMP_GLOW_BOOST = 0.6;
const RAIL_BRIDGE_DECK_Y = LAND_Y + 0.5;
const RAIL_TRUSS_MIN_LEN_M = 150;
const PIER_MIN_BRIDGE_LEN_M = 42;
const PIER_SPACING_M = 30;
const MEDIAN_SHRUB_MIN_W = 1.6;
const MEDIAN_SHRUB_END_PAD_M = 4.5;
const ROADS_BUF_INITIAL = 160000;

export interface ClearingBox {
  ring: number[][];
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

// flat polygon layers painted onto the land (no depth write, drawn in order)
export function overlayMaterial(order: number) {
  return cityMaterial({
    overlay: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1 - order,
    polygonOffsetUnits: -2 - order * 2,
  });
}

// the replicas' clearings (places/index.js placeClearings): ground a model lays itself, flush with the land
export function inClearing(clearings: ClearingBox[], x: number, z: number) {
  for (const box of clearings) {
    if (x >= box.x0 && x <= box.x1 && z >= box.z0 && z <= box.z1 && inPoly(box.ring, x, z)) return true;
  }
  return false;
}

export function clearingsOf(data: any): ClearingBox[] {
  return placeClearings(data).map((ring: number[][]) => {
    const xs = ring.map((pt) => pt[0]);
    const zs = ring.map((pt) => pt[1]);
    return { ring, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  });
}

// a path with the stretches inside the clearings taken out (tested every half metre), as the runs left outside
function outsideRuns(pts: number[][], clearings: ClearingBox[]) {
  if (!clearings.length || pts.length < 2) return pts.length >= 2 && pathLength(pts) > 0.5 ? [pts] : [];
  let px0 = Infinity, px1 = -Infinity, pz0 = Infinity, pz1 = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0], z = pts[i][1];
    if (x < px0) px0 = x;
    if (x > px1) px1 = x;
    if (z < pz0) pz0 = z;
    if (z > pz1) pz1 = z;
  }
  const near: ClearingBox[] = [];
  for (let i = 0; i < clearings.length; i++) {
    const box = clearings[i];
    if (px1 >= box.x0 && px0 <= box.x1 && pz1 >= box.z0 && pz0 <= box.z1) near.push(box);
  }
  if (!near.length) return pathLength(pts) > 0.5 ? [pts] : [];

  const runs: number[][][] = [];
  let current: number[][] = [];
  let prevOutside: number[] | null = null;
  const finishRun = () => {
    if (current.length >= 2 && pathLength(current) > 0.5) runs.push(current);
    current = [];
  };
  for (let i = 0; i + 1 < pts.length; i++) {
    const start = pts[i];
    const end = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 0.5));
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const pt = k === 0 ? start : k === steps ? end : [start[0] + ((end[0] - start[0]) * k) / steps, start[1] + ((end[1] - start[1]) * k) / steps];
      const isOut = !inClearing(near, pt[0], pt[1]);
      if (isOut && (k === 0 || k === steps || !prevOutside)) current.push(pt);
      else if (!isOut && prevOutside) {
        if (current[current.length - 1] !== prevOutside) current.push(prevOutside);
        finishRun();
      }
      prevOutside = isOut ? pt : null;
    }
  }
  finishRun();
  return runs;
}

function ribbonPoints(pts: number[][], width: number | number[], ends: any = null) {
  const count = pts.length;
  const leftEdge: number[][] = [];
  const rightEdge: number[][] = [];
  for (let i = 0; i < count; i++) {
    const pt = pts[i];
    const end = i === 0 ? ends?.[0] : i === count - 1 ? ends?.[1] : null;
    const cutDir = end && end.dir; // a hand deck's end line
    const prev = i === 0 && end && !cutDir ? end : pts[Math.max(0, i - 1)];
    const next = i === count - 1 && end && !cutDir ? end : pts[Math.min(count - 1, i + 1)];
    let d1x = pt[0] - prev[0], d1z = pt[1] - prev[1];
    let d2x = next[0] - pt[0], d2z = next[1] - pt[1];
    let len1 = Math.hypot(d1x, d1z), len2 = Math.hypot(d2x, d2z);
    if (len1 < 1e-6) { d1x = d2x; d1z = d2z; len1 = len2; }
    if (len2 < 1e-6) { d2x = d1x; d2z = d1z; len2 = len1; }
    if (len1 < 1e-6) { leftEdge.push(pt); rightEdge.push(pt); continue; }
    d1x /= len1; d1z /= len1; d2x /= len2; d2z /= len2;
    let tanX = d1x + d2x, tanZ = d1z + d2z;
    const tanLen = Math.hypot(tanX, tanZ);
    if (tanLen < 1e-6) { tanX = d1x; tanZ = d1z; } else { tanX /= tanLen; tanZ /= tanLen; }
    if (cutDir) {
      const sign = cutDir[0] * d1x + cutDir[1] * d1z < 0 ? -1 : 1;
      tanX = cutDir[0] * sign;
      tanZ = cutDir[1] * sign;
    }
    const normX = -tanZ, normZ = tanX;
    const halfWidth = (Array.isArray(width) ? width[i] : width) / 2;
    const miter = halfWidth / Math.max(MITER_MIN_COS, normX * -d1z + normZ * d1x);
    leftEdge.push([pt[0] + normX * miter, pt[1] + normZ * miter]);
    rightEdge.push([pt[0] - normX * miter, pt[1] - normZ * miter]);
  }
  return [leftEdge, rightEdge] as const;
}

function snapEnds(pts: number[][], ends: any) {
  if (!ends || !(ends[0]?.line || ends[1]?.line)) return pts;
  const out = pts.slice();
  for (const endIdx of [0, 1]) {
    const line = ends[endIdx]?.line;
    if (!line || out.length < 2) continue;
    const idx = endIdx ? out.length - 1 : 0;
    const tip = out[idx];
    const adj = out[endIdx ? idx - 1 : 1];
    const len = Math.hypot(tip[0] - adj[0], tip[1] - adj[1]);
    const dx = (tip[0] - adj[0]) / len;
    const dz = (tip[1] - adj[1]) / len;
    const dot = dx * line.u[0] + dz * line.u[1];
    if (!(len > SNAP_MIN_SEG_M) || Math.abs(dot) < SNAP_MIN_DOT) continue;
    const dist = -((tip[0] - line.p[0]) * line.u[0] + (tip[1] - line.p[1]) * line.u[1]) / dot;
    if (dist < -(len - SNAP_MIN_RETRACT_MARGIN_M) || dist > SNAP_MAX_EXTEND_M) continue;
    out[idx] = [tip[0] + dx * dist, tip[1] + dz * dist];
  }
  return out;
}

function widthAt(pts: number[][], widths: number[], pt: number[]) {
  let bestDist = Infinity;
  let width = widths[0];
  for (let i = 0; i + 1 < pts.length; i++) {
    const start = pts[i];
    const end = pts[i + 1];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const lenSq = dx * dx + dz * dz;
    const param = lenSq ? Math.max(0, Math.min(1, ((pt[0] - start[0]) * dx + (pt[1] - start[1]) * dz) / lenSq)) : 0;
    const dist = Math.hypot(pt[0] - start[0] - param * dx, pt[1] - start[1] - param * dz);
    if (dist < bestDist) { bestDist = dist; width = widths[i] + (widths[i + 1] - widths[i]) * param; }
  }
  return width;
}

function ribbon(buf: Buf, pts0: number[][], width: number | number[], baseY: number, color: number[], ends: any = null, cachedSnapped?: number[][], cachedDraped?: number[][]) {
  const snapped = cachedSnapped || snapEnds(pts0, ends);
  const pts = cachedDraped || drape(snapped);
  const resolvedWidth = Array.isArray(width) && pts.length !== pts0.length ? pts.map((pt) => widthAt(pts0, width, pt)) : width;
  const [leftEdge, rightEdge] = ribbonPoints(pts, resolvedWidth, ends);
  const lift = pts === snapped ? 0 : DRAPE_LIFT_M;
  for (let i = 0; i + 1 < pts.length; i++) {
    const l0x = leftEdge[i][0], l0z = leftEdge[i][1];
    const r0x = rightEdge[i][0], r0z = rightEdge[i][1];
    const r1x = rightEdge[i + 1][0], r1z = rightEdge[i + 1][1];
    const l1x = leftEdge[i + 1][0], l1z = leftEdge[i + 1][1];
    buf.quad(
      [l0x, baseY + rise(l0x, l0z) + lift, l0z],
      [r0x, baseY + rise(r0x, r0z) + lift, r0z],
      [r1x, baseY + rise(r1x, r1z) + lift, r1z],
      [l1x, baseY + rise(l1x, l1z) + lift, l1z],
      color,
      [0, 1, 0],
    );
  }
}

function slab(buf: Buf, pts: number[][], width: number, yTop: any, thick: number, color: number[], sideCol: number[], parapet = 0, bottom: any = null, opt: Record<string, any> = {}) {
  const [leftEdge, rightEdge] = ribbonPoints(pts, width, opt.ends);
  const lane = opt.lane && opt.lane.w < width - 0.2 ? ribbonPoints(pts, opt.lane.w, opt.ends) : null;
  const topYs: number[] = [];
  const botYs: number[] = [];
  const arcPos: number[] = [];
  const totalLen = pathLength(pts) || 1;
  let dist = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    arcPos.push(dist);
    const yVal = typeof yTop === 'function' ? yTop(dist) : Array.isArray(yTop) ? yTop[0] + ((yTop[1] - yTop[0]) * dist) / totalLen : yTop;
    topYs.push(yVal);
    botYs.push(bottom ? bottom(dist, yVal) : yVal - thick);
  }
  const tiltedY = (idx: number, pt: number[]) => topYs[idx] + (opt.tilt ? opt.tilt(arcPos[idx], pt, pts[idx]) : 0);
  for (let i = 0; i + 1 < pts.length; i++) {
    const j = i + 1;
    const botI = botYs[i], botJ = botYs[j];
    const leftI = tiltedY(i, leftEdge[i]), rightI = tiltedY(i, rightEdge[i]);
    const leftJ = tiltedY(j, leftEdge[j]), rightJ = tiltedY(j, rightEdge[j]);
    buf.quad([leftEdge[i][0], leftI, leftEdge[i][1]], [rightEdge[i][0], rightI, rightEdge[i][1]], [rightEdge[j][0], rightJ, rightEdge[j][1]], [leftEdge[j][0], leftJ, leftEdge[j][1]], color, [0, 1, 0]);
    if (lane) {
      const [laneL, laneR] = lane;
      buf.quad(
        [laneL[i][0], tiltedY(i, laneL[i]) + LANE_OVERLAY_EPS_M, laneL[i][1]],
        [laneR[i][0], tiltedY(i, laneR[i]) + LANE_OVERLAY_EPS_M, laneR[i][1]],
        [laneR[j][0], tiltedY(j, laneR[j]) + LANE_OVERLAY_EPS_M, laneR[j][1]],
        [laneL[j][0], tiltedY(j, laneL[j]) + LANE_OVERLAY_EPS_M, laneL[j][1]],
        opt.lane.col,
        [0, 1, 0],
      );
    }
    buf.quad([leftEdge[i][0], botI, leftEdge[i][1]], [rightEdge[i][0], botI, rightEdge[i][1]], [rightEdge[j][0], botJ, rightEdge[j][1]], [leftEdge[j][0], botJ, leftEdge[j][1]], sideCol, [0, -1, 0]);
    const normX = leftEdge[i][0] - rightEdge[i][0];
    const normZ = leftEdge[i][1] - rightEdge[i][1];
    buf.quad([leftEdge[i][0], botI, leftEdge[i][1]], [leftEdge[j][0], botJ, leftEdge[j][1]], [leftEdge[j][0], leftJ + parapet, leftEdge[j][1]], [leftEdge[i][0], leftI + parapet, leftEdge[i][1]], sideCol, [normX, 0, normZ]);
    buf.quad([rightEdge[i][0], botI, rightEdge[i][1]], [rightEdge[j][0], botJ, rightEdge[j][1]], [rightEdge[j][0], rightJ + parapet, rightEdge[j][1]], [rightEdge[i][0], rightI + parapet, rightEdge[i][1]], sideCol, [-normX, 0, -normZ]);
    if (parapet) {
      buf.quad([leftEdge[i][0], leftI + parapet, leftEdge[i][1]], [leftEdge[j][0], leftJ + parapet, leftEdge[j][1]], [leftEdge[j][0], leftJ, leftEdge[j][1]], [leftEdge[i][0], leftI, leftEdge[i][1]], sideCol, [-normX, 0, -normZ]);
      buf.quad([rightEdge[i][0], rightI + parapet, rightEdge[i][1]], [rightEdge[j][0], rightJ + parapet, rightEdge[j][1]], [rightEdge[j][0], rightJ, rightEdge[j][1]], [rightEdge[i][0], rightI, rightEdge[i][1]], sideCol, [normX, 0, normZ]);
    }
  }
}

const smooth01 = (val: number) => {
  const clamped = Math.max(0, Math.min(1, val));
  return clamped * clamped * (3 - 2 * clamped);
};

// The lean a level deck needs at its ends to meet a street laid on a cross-slope, or null where neither end needs it.
function landingTilt(pts: number[][], len: number, width: number) {
  const rampLen = Math.min(LAND_RAMP, len * 0.2);
  const endpoints = [pts[0], pts[pts.length - 1]];
  const needsLean = endpoints.map((pt, endIdx) => {
    const adj = pts[endIdx ? pts.length - 2 : 1];
    const segLen = Math.hypot(adj[0] - pt[0], adj[1] - pt[1]) || 1;
    const normX = -(adj[1] - pt[1]) / segLen;
    const normZ = (adj[0] - pt[0]) / segLen;
    return Math.abs(rise(pt[0] + normX * width / 2, pt[1] + normZ * width / 2) - rise(pt[0] - normX * width / 2, pt[1] - normZ * width / 2)) > LANDING_TILT_THRESHOLD_M;
  });
  if (!needsLean[0] && !needsLean[1]) return null;
  return (dist: number, pt: number[], center: number[]) => {
    const blend = Math.max(needsLean[0] ? 1 - smooth01(dist / rampLen) : 0, needsLean[1] ? 1 - smooth01((len - dist) / rampLen) : 0);
    return blend ? blend * (rise(pt[0], pt[1]) - rise(center[0], center[1])) : 0;
  };
}

function pointAlongPath(pts: number[][], dist: number) {
  let acc = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const start = pts[i];
    const end = pts[i + 1];
    const segLen = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (acc + segLen >= dist && segLen > 0) {
      const frac = (dist - acc) / segLen;
      return {
        p: [start[0] + (end[0] - start[0]) * frac, start[1] + (end[1] - start[1]) * frac],
        a: Math.atan2(end[1] - start[1], end[0] - start[0]),
      };
    }
    acc += segLen;
  }
  const start = pts[pts.length - 2];
  const end = pts[pts.length - 1];
  return { p: end, a: Math.atan2(end[1] - start[1], end[0] - start[0]) };
}

// Cầu Bạch Hổ, the 1908 railway bridge: steel through-trusses with a bowed top chord, one per span.
function railTruss(buf: Buf, pts: number[][], len: number, deckY: number, pierCol: number[]) {
  const spans = Math.max(2, Math.round(len / 58));
  const spanLen = len / spans;
  const panels = 8;
  const halfWidth = 3.1;
  const steel = hex('#8f979b');
  const steelDark = hex('#737b80');
  const nodeAt = (dist: number, side: number, y: number) => {
    const { p, a } = pointAlongPath(pts, Math.min(len - 0.01, Math.max(0.01, dist)));
    return [p[0] - Math.sin(a) * side * halfWidth, y, p[1] + Math.cos(a) * side * halfWidth];
  };
  for (let k = 1; k < spans; k++) {
    const { p, a } = pointAlongPath(pts, Math.min(len - 0.01, Math.max(0.01, k * spanLen)));
    buf.kind = KIND.MASONRY;
    buf.box(p[0], p[1], -3, deckY - 1.3, 3.0, 8.4, a, pierCol, { taper: 0.9 });
    buf.kind = KIND.PLAIN;
  }
  for (let k = 0; k < spans; k++) {
    const startS = k * spanLen + 0.5;
    const panelLen = (spanLen - 1) / panels;
    const chordHeight = (idx: number) => 4.4 + 3.4 * Math.sin((Math.PI * idx) / panels);
    for (const side of [-1, 1]) {
      const bottomNodes: number[][] = [];
      const topNodes: (number[] | null)[] = [];
      for (let i = 0; i <= panels; i++) {
        bottomNodes.push(nodeAt(startS + i * panelLen, side, deckY + 0.25));
        topNodes.push(i === 0 || i === panels ? null : nodeAt(startS + i * panelLen, side, deckY + chordHeight(i)));
      }
      buf.beam(bottomNodes[0], bottomNodes[panels], 0.34, 0.5, steelDark);
      buf.beam(bottomNodes[0], topNodes[1], 0.36, 0.4, steel);
      buf.beam(topNodes[panels - 1], bottomNodes[panels], 0.36, 0.4, steel);
      for (let i = 1; i < panels; i++) {
        buf.beam(bottomNodes[i], topNodes[i], 0.2, 0.26, steel);
        if (i < panels - 1) buf.beam(topNodes[i], topNodes[i + 1], 0.36, 0.4, steel);
        if (i < panels / 2) buf.beam(topNodes[i], bottomNodes[i + 1], 0.18, 0.22, steelDark);
        else if (i > panels / 2) buf.beam(topNodes[i], bottomNodes[i - 1], 0.18, 0.22, steelDark);
      }
    }
    for (let i = 1; i < panels; i++) {
      const left = nodeAt(startS + i * panelLen, -1, deckY + chordHeight(i));
      const right = nodeAt(startS + i * panelLen, 1, deckY + chordHeight(i));
      buf.beam(left, right, 0.2, 0.24, steelDark);
      if (i < panels - 1) buf.beam(left, nodeAt(startS + (i + 1) * panelLen, 1, deckY + chordHeight(i + 1)), 0.12, 0.14, steelDark);
    }
  }
}

// Low clipped shrubs along a median strip, about every 2.5 m, left out where the strip is too narrow to hold them.
function medianShrubs(structures: Buf, medians: { w: number; pts: number[][]; ws: number[] }[]) {
  const greens = PAL.shrubs.map(hex);
  const prevKind = structures.kind;
  structures.kind = KIND.PLAIN;
  let shrubIdx = 0;
  for (const median of medians) {
    if (median.w < MEDIAN_SHRUB_MIN_W) continue;
    const len = pathLength(median.pts);
    for (let dist = MEDIAN_SHRUB_END_PAD_M + rand(shrubIdx, 7) * 1.5; dist < len - MEDIAN_SHRUB_END_PAD_M; dist += 2.2 + rand(shrubIdx, 3) * 1.2, shrubIdx++) {
      const { p, a } = pointAlongPath(median.pts, dist);
      const width = widthAt(median.pts, median.ws, p);
      if (width < MEDIAN_SHRUB_MIN_W) continue;
      const maxRadius = Math.min(0.75, width / 2 - 0.45);
      const lateralJitter = (rand(shrubIdx, 11) - 0.5) * Math.max(0, width - 0.9 - 2 * maxRadius);
      const x = p[0] - Math.sin(a) * lateralJitter;
      const z = p[1] + Math.cos(a) * lateralJitter;
      const baseY = LAND_Y + rise(x, z) + 0.05;
      const radius = maxRadius * (0.75 + rand(shrubIdx, 5) * 0.35);
      const height = 0.55 + rand(shrubIdx, 9) * 0.45;
      structures.cyl(x, z, baseY, baseY + height * 0.6, radius * 0.8, radius, 7, pick(greens, shrubIdx), { cap: false, rot: rand(shrubIdx, 13) });
      structures.cyl(x, z, baseY + height * 0.6, baseY + height, radius, radius * 0.45, 7, pick(greens, shrubIdx + 1), { rot: rand(shrubIdx, 13) });
    }
  }
  structures.kind = prevKind;
}

function buildLaneMarkings(buf: Buf, roads: any[], holeCells: any, baseY: number, preDashes?: [number, number][]) {
  const paint = hex('#f4eedd');
  if (preDashes && preDashes.length) {
    const dashes = new Array<any>(preDashes.length);
    for (let i = 0; i < preDashes.length; i++) {
      const [id, s0] = preDashes[i];
      const pts = roads[id].pts;
      const p0 = pointAlongPath(pts, s0).p;
      const p1 = pointAlongPath(pts, s0 + DASH_LEN_M).p;
      ribbon(buf, [p0, p1], DASH_WIDTH_M, baseY + 0.02, paint);
      dashes[i] = { id, s0, p0, p1 };
    }
    return dashes;
  }
  const guard = markingGuard(
    roads.map((road, id) => ({ id, c: road.c, w: road.w, ws: road.ws, pts: road.pts, bridge: road.bridge })).filter((road) => !road.bridge && road.c <= 2),
    holeCells,
  );
  const dashes: any[] = [];
  roads.forEach((road, id) => {
    if (road.bridge || road.c > 1 || road.unmarked) return;
    const pts = road.pts;
    const nSegs = pts.length - 1;
    if (nSegs < 1) return;
    const segLen = new Float64Array(nSegs);
    const segAng = new Float64Array(nSegs);
    let len = 0;
    for (let i = 0; i < nSegs; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1];
      const l = Math.hypot(dx, dz);
      segLen[i] = l;
      segAng[i] = Math.atan2(dz, dx);
      len += l;
    }
    const maxDist = Math.floor(len);
    const free = new Uint8Array(maxDist + 1);
    let segIdx = 0, segStartS = 0;
    for (let dist = 0; dist <= maxDist; dist++) {
      while (segIdx < nSegs - 1 && segStartS + segLen[segIdx] < dist) {
        segStartS += segLen[segIdx];
        segIdx++;
      }
      const l = segLen[segIdx];
      const frac = l > 0 ? Math.max(0, Math.min(1, (dist - segStartS) / l)) : 0;
      const px = pts[segIdx][0] + (pts[segIdx + 1][0] - pts[segIdx][0]) * frac;
      const pz = pts[segIdx][1] + (pts[segIdx + 1][1] - pts[segIdx][1]) * frac;
      free[dist] = guard(id, px, pz, segAng[segIdx]) ? 1 : 0;
    }
    const isClear = (startS: number) => {
      for (let k = 0; k <= DASH_LEN_M; k++) if (!free[startS + k]) return false;
      return true;
    };
    const starts: number[] = [];
    for (let startS = DASH_START_M; startS + DASH_LEN_M < len; startS += DASH_RHYTHM_M) {
      if (isClear(startS)) starts.push(startS);
    }
    for (let runStart = 0; runStart < free.length;) {
      if (!free[runStart]) { runStart++; continue; }
      let runEnd = runStart;
      while (runEnd + 1 < free.length && free[runEnd + 1]) runEnd++;
      if (runEnd - runStart >= DASH_SHORT_RUN_MIN_M && !starts.some((s0) => s0 + DASH_LEN_M >= runStart && s0 <= runEnd)) {
        starts.push(Math.floor((runStart + runEnd) / 2) - 2);
      }
      runStart = runEnd + 1;
    }
    for (const startS of starts) {
      const p0 = pointAlongPath(pts, startS).p;
      const p1 = pointAlongPath(pts, startS + DASH_LEN_M).p;
      ribbon(buf, [p0, p1], DASH_WIDTH_M, baseY + 0.02, paint);
      dashes.push({ id, s0: startS, p0, p1 });
    }
  });
  return dashes;
}

function buildBridgeDecks(data: any, roads: any[], profiles: Map<any, any>, structures: Buf, casing: number[], roadCols: number[][]) {
  const pierCol = PAL.pier;
  const deckSide = hex('#a59c8b');
  let daVienPavilionsDone = false;
  const ownDeck = thuyTienBridgeRoads(data);

  for (const road of roads) {
    if (!road.bridge || ownDeck.has(road.flat)) continue;
    if (replaced('giahoi') && giaHoiRoads(data).has(road.flat)) continue;
    if (replaced('bachho') && daVienRoads(data).has(road.flat)) continue;
    if (replaced('minhmang') && minhMangRoads(data).has(road.flat)) continue;
    if (replaced('golim') && road.c === 5 && road.pts.some((pt: number[]) => Math.hypot(pt[0] + 72.9, pt[1] - 281.6) < 1 || Math.hypot(pt[0] + 298, pt[1] - 500.2) < 1)) continue;

    const deckWidth = road.bridge === 2
      ? ROAD_W[road.c] + (road.c <= 2 ? 3 : 1.5)
      : road.c <= 3 ? road.w + (road.c <= 2 ? PAVEMENT_ADD_MAJOR_M : PAVEMENT_ADD_MINOR_M)
        : road.w + KERB_ADD_MINOR_M;
    const slabOpt = { lane: { w: road.w, col: roadCols[Math.min(road.c, ROAD_MAX)] }, ends: road.ends };
    const deckTop = road.c <= 3 ? casing : shade(roadCols[Math.min(road.c, ROAD_MAX)], 0.85);
    const profile = profiles.get(road.flat);
    if (!profile) continue;
    if (profile.name === 'Cầu Phú Xuân' && replaced('phuxuan')) continue;
    if (profile.name === 'Cầu Cửa Ngăn' && replaced('gate:Cửa Ngăn')) continue;
    if (profile.name === 'Đông Thành Thủy Quan' && replaced('thuyquan')) continue;

    const parapet = road.c <= 4 ? 0.9 : 0.5;
    if (profile.citadel) { citadelBridge(structures, road.pts, deckWidth, profile, roadCols[Math.min(road.c, 3)], road.ends); continue; }

    if (profile.span) {
      const spanStart = profile.span[0];
      const sampled = resample(subPath(road.pts, spanStart, profile.span[1]), Math.min(2, profile.len / 16));
      const ends = [spanStart < 0.05 ? road.ends?.[0] : null, profile.span[1] > profile.len - 0.05 ? road.ends?.[1] : null];
      slab(structures, sampled.pts, deckWidth, (s: number) => profile.y(spanStart + s), profile.thick, deckTop, deckSide, parapet, null, { ...slabOpt, ends });
    } else if (profile.rise > 0) {
      const sampled = resample(road.pts, profile.arches ? 0.5 : Math.min(2, profile.len / 16), profile.breaks);
      const prevKind = structures.kind;
      if (profile.arches) structures.kind = KIND.MASONRY;
      slab(
        structures, sampled.pts, deckWidth, profile.y, profile.thick,
        profile.arches ? roadCols[Math.min(road.c, 3)] : deckTop,
        profile.arches ? hex('#b3a58c') : deckSide,
        parapet, profile.bottom || null, profile.arches ? { ends: road.ends } : slabOpt,
      );
      structures.kind = prevKind;
    } else {
      const tilt = road.c <= 4 ? landingTilt(road.pts, profile.len, deckWidth) : null;
      if (tilt) slab(structures, resample(road.pts, 1.5).pts, deckWidth, profile.y, profile.thick, deckTop, deckSide, parapet, null, { ...slabOpt, tilt });
      else slab(structures, profile.breaks.length ? resample(road.pts, 8, profile.breaks).pts : road.pts, deckWidth, profile.y, profile.thick, deckTop, deckSide, parapet, null, slabOpt);
    }

    const len = pathLength(road.pts);
    const midPt = road.pts[road.pts.length >> 1];
    const daVienPlace = daVienPavilionsDone || replaced('bachho') ? null : (data.places || []).find((place: any) => place.id === 'bachho');
    if (daVienPlace && len > 250 && road.c <= 1 && Math.hypot(midPt[0] - daVienPlace.x / DECIMETRES_PER_METRE, midPt[1] - daVienPlace.z / DECIMETRES_PER_METRE) < 420) {
      daVienPavilionsDone = true;
      for (const frac of [0.25, 0.5, 0.75]) {
        for (const side of [-1, 1]) {
          const { p, a } = pointAlongPath(road.pts, len * frac);
          const off = deckWidth / 2 + 1.6;
          const x = p[0] - Math.sin(a) * side * off;
          const z = p[1] + Math.cos(a) * side * off;
          structures.kind = KIND.PLAIN;
          structures.box(x, z, profile.top - 0.9, profile.top, 4.6, 4.6, a, deckSide, { bottom: true });
          pavilion(structures, x, z, 3.4, 3.4, a, profile.top, { wallH: 2.6, roof: hex('#8f4a36'), wall: hex('#c9b99a'), over: 0.9, rh: 1.5, ridge: hex('#d9c9a0') });
        }
      }
    }

    if (len > PIER_MIN_BRIDGE_LEN_M && road.c <= 3 && !profile.arches) {
      const pierCount = Math.max(1, Math.round(len / PIER_SPACING_M) - 1);
      for (let i = 1; i <= pierCount; i++) {
        const dist = (len * i) / (pierCount + 1);
        const { p, a } = pointAlongPath(road.pts, dist);
        structures.box(p[0], p[1], profile.lift - 3, profile.y(dist) - profile.thick + 0.1, 2.2, deckWidth - 2.5, a, pierCol);
      }
    }
  }

  for (const [, bridge, flat] of data.rails || []) {
    if (!bridge) continue;
    const pts = unflat(flat);
    if (replaced('bachho') && pts.every((pt: number[]) => Math.hypot(pt[0] + 1830, pt[1] - 1135) < 300)) continue;
    slab(structures, pts, 5.5, RAIL_BRIDGE_DECK_Y, 1.4, hex(PAL.rail), hex('#6d6670'), 1.6);
    const len = pathLength(pts);
    if (len > RAIL_TRUSS_MIN_LEN_M) { railTruss(structures, pts, len, RAIL_BRIDGE_DECK_Y, pierCol); continue; }
    const pierCount = Math.round(len / 34) - 1;
    for (let i = 1; i <= pierCount; i++) {
      const { p, a } = pointAlongPath(pts, (len * i) / (pierCount + 1));
      structures.box(p[0], p[1], -3, LAND_Y - 0.9, 2.4, 6, a, pierCol);
    }
  }
}

function buildStreetLamps(data: any, roads: any[], profiles: Map<any, any>, group: THREE.Group) {
  const lampPos: number[] = [];
  const lampCol: number[] = [];
  for (const road of roads) {
    if (road.c > 2 || !road.flat || road.unmarked) continue;
    if (road.bridge && replaced('bachho') && daVienRoads(data).has(road.flat)) continue;
    const profile = road.bridge ? profiles.get(road.flat) : null;
    if (road.bridge && !profile) continue;
    if (profile && profile.lamps && replaced(profile.lamps.own)) {
      for (const { y, sides } of bridgeLamps(profile, road.pts)) {
        for (const { head } of sides) {
          lampPos.push(head[0], y + profile.lamps.h, head[1]);
          const warm = 0.85 + rand(lampPos.length, road.c) * 0.3;
          lampCol.push(1.0 * warm, 0.74 * warm, 0.42 * warm);
        }
      }
      continue;
    }
    const len = pathLength(road.pts);
    const step = road.c === 0 ? LAMP_STEP_PRIMARY_M : LAMP_STEP_SECONDARY_M;
    for (let dist = step / 2, k = 0; dist < len; dist += step, k++) {
      const { p, a } = pointAlongPath(road.pts, dist);
      const halfW = (road.ws ? widthAt(road.pts, road.ws, p) : road.w) / 2 + 0.5;
      const lateral = halfW * (k % 2 ? 1 : -1);
      const lx = p[0] - Math.sin(a) * lateral;
      const lz = p[1] + Math.cos(a) * lateral;
      if (ownLit(data, lx, lz)) continue;
      lampPos.push(lx, profile ? profile.y(dist) + LAMP_HEIGHT_M : LAND_Y + rise(lx, lz) + LAMP_HEIGHT_M, lz);
      const warm = 0.85 + rand(k, road.c) * 0.3;
      lampCol.push(1.0 * warm, 0.74 * warm, 0.42 * warm);
    }
  }
  const lamps = glowPoints(lampPos, lampCol, LAMP_GLOW_SIZE);
  lamps.material.uniforms.uBoost.value = LAMP_GLOW_BOOST;
  group.add(lamps);
  return lamps;
}

export function buildRoads(data: any, group: THREE.Group, structures: Buf, clearings: ClearingBox[] = []) {
  const buf = new Buf(ROADS_BUF_INITIAL);
  buf.kind = KIND.ROAD;
  const ownedWay = placeOwnsWay(data);
  let roads: any[] = (data.roads || []).filter((entry: any) => !ownedWay(entry)).map((entry: any) => ({
    c: Math.max(0, Math.min(ROAD_MAX, entry[0] | 0)),
    w: roadWidth(entry),
    ...(entry[4] ? { ws: entry[4].map((val: number) => val / DECIMETRES_PER_METRE) } : {}),
    bridge: entry[1],
    flat: entry[2],
    pts: unflat(entry[2]),
    ...(entry[5] > 0 ? { lanes: entry[5], unmarked: true } : {}),
  }));
  if (clearings.length) {
    roads = roads.flatMap((road) => (
      road.c < 5 || road.bridge ? [road] : outsideRuns(road.pts, clearings).map((pts) => ({ ...road, pts, flat: null }))
    ));
  }

  const profiles = bridgeProfiles(data);
  for (const road of [...roads]) {
    const profile = road.bridge && profiles.get(road.flat);
    if (!profile || !profile.span) continue;
    road.cut = [profile.span[0] > 0.05, profile.span[1] < profile.len - 0.05];
    for (const [s0, s1] of [[0, profile.span[0]], [profile.span[1], profile.len]]) {
      if (s1 - s0 > 0.05) roads.push({ c: road.c, w: road.w, bridge: 0, flat: null, head: true, pts: subPath(road.pts, s0, s1) });
    }
  }
  bridgeJoints(roads);
  handDeckJoints(roads, placeDeckEnds(data));
  for (const road of roads) {
    if (!road.bridge) {
      road._snapped = snapEnds(road.pts, road.ends);
      road._draped = drape(road._snapped);
      if (road.ws && road._draped.length !== road.pts.length) {
        road._drapedWs = road._draped.map((pt: number[]) => widthAt(road.pts, road.ws, pt));
      }
    }
  }

  const casing = hex(PAL.casing);
  const roadCols = PAL.road.map(hex);
  const baseY = LAND_Y + ROAD_BASE_Y_OFFSET;
  const widthPlus = (road: any, add = 0) => {
    const src = road._drapedWs || road.ws;
    return src ? (add === 0 ? src : src.map((w: number) => w + add)) : road.w + add;
  };
  const pavementWidth = (road: any) => widthPlus(road, road.c <= 2 ? PAVEMENT_ADD_MAJOR_M : PAVEMENT_ADD_MINOR_M);
  const kerbCol = shade(casing, 0.8);
  const vergeCol = shade(casing, 0.9);
  const roadRibbon = (road: any, w: number | number[], y: number, col: number[]) =>
    ribbon(buf, road._draped, w, y, col, road.ends, road._snapped, road._draped);

  buf.kind = KIND.LINE;
  for (const road of roads) if (!road.bridge && road.c <= 3) roadRibbon(road, widthPlus(road, (road.c <= 2 ? PAVEMENT_ADD_MAJOR_M : PAVEMENT_ADD_MINOR_M) + VERGE_EXTRA_M), baseY - 0.005, vergeCol);
  buf.kind = KIND.ROAD;
  for (const road of roads) if (!road.bridge && road.c <= 3) roadRibbon(road, pavementWidth(road), baseY, casing);
  buf.kind = KIND.LINE;
  for (const road of roads) if (!road.bridge && road.c <= 4) roadRibbon(road, widthPlus(road, road.c <= 2 ? KERB_ADD_MAJOR_M : KERB_ADD_MINOR_M), baseY + 0.005, road.c <= 3 ? kerbCol : shade(roadCols[4], 0.85));

  const carriageways: any[] = [];
  roads.forEach((road, id) => {
    if (road.bridge || road.c > 4) return;
    const pts = road._draped;
    const [leftEdge, rightEdge] = ribbonPoints(pts, road._drapedWs || road.ws || road.w, road.ends);
    carriageways.push({ id, c: road.c, pts: road.pts, L: leftEdge, R: rightEdge, u: road.unmarked });
  });
  const pre = data.precomputed;
  let holes: any[];
  let holeCells: Set<number>;
  if (pre?.holes && pre?.holeCells) {
    holes = pre.holes.map(([c, x, z, area, flatRects]: [number, number, number, number, number[]]) => {
      const rects: [number, number, number, number][] = [];
      for (let i = 0; i < flatRects.length; i += 4) rects.push([flatRects[i], flatRects[i + 1], flatRects[i + 2], flatRects[i + 3]]);
      return { c, x, z, area, rects };
    });
    holeCells = new Set<number>();
    const runs: number[] = pre.holeCells;
    for (let i = 0; i < runs.length; i += 3) {
      const cj = runs[i], ci0 = runs[i + 1], ci1 = runs[i + 2];
      for (let ci = ci0; ci <= ci1; ci++) holeCells.add(ci * 1048576 + cj);
    }
  } else {
    const greens = (data.green || []).filter(([kind]: any) => kind !== 'paved').map(([, poly]: any) => unflat(poly[0]));
    const computed = junctionHoles(carriageways, (x: number, z: number) => greens.some((poly: any) => inPoly(poly, x, z)));
    holes = computed.holes;
    holeCells = computed.cells;
  }

  buf.kind = KIND.ROAD;
  for (const hole of holes) {
    const lift = rise(hole.x, hole.z) > 0 ? DRAPE_LIFT_M : 0;
    const col = roadCols[Math.min(hole.c, ROAD_MAX)];
    const vertex = (x: number, z: number) => [x, baseY + 0.0055 + rise(x, z) + lift, z];
    const rects = hole.rects || (hole.rects = holeRects(hole));
    for (const [x0, x1, z0, z1] of rects) buf.quad(vertex(x0, z0), vertex(x0, z1), vertex(x1, z1), vertex(x1, z0), col, [0, 1, 0]);
  }

  const paved: any[] = [];
  const sliverList: any[] = pre?.slivers
    ? pre.slivers.map(([c, flatPts, ws]: [number, number[], number[]]) => {
        const pts: number[][] = [];
        for (let i = 0; i < flatPts.length; i += 2) pts.push([flatPts[i], flatPts[i + 1]]);
        return { c, pts, ws };
      })
    : slivers(roads.filter((road) => !road.bridge && road.c <= 4));
  for (const sliver of sliverList) {
    ribbon(buf, sliver.pts, sliver.ws, baseY + 0.0055, roadCols[Math.min(sliver.c, ROAD_MAX)]);
    const [leftEdge, rightEdge] = ribbonPoints(sliver.pts, sliver.ws);
    paved.push({ L: leftEdge, R: rightEdge });
  }

  const medians = (data.medians || []).map(([w, flat, ws]: any) => {
    const pts = unflat(flat);
    return { w: w / DECIMETRES_PER_METRE, pts, ws: ws ? ws.map((val: number) => val / DECIMETRES_PER_METRE) : pts.map(() => w / DECIMETRES_PER_METRE) };
  });
  const kerbStone = hex(PAL.medianKerb);
  const turf = hex(PAL.median);
  buf.kind = KIND.ROAD;
  for (const median of medians) ribbon(buf, median.pts, median.ws, baseY + 0.006, kerbStone);
  buf.kind = KIND.GROUND;
  for (const median of medians) if (median.w > 0.9) ribbon(buf, median.pts, median.ws.map((w: number) => Math.max(0.05, w - 0.6)), baseY + 0.008, turf);
  medianShrubs(structures, medians);

  buf.kind = KIND.ROAD;
  for (let cls = ROAD_MAX; cls >= 0; cls--) {
    for (const road of roads) if (road.c === cls && !road.bridge) roadRibbon(road, widthPlus(road), baseY + 0.01, roadCols[cls]);
  }

  const dashes = buildLaneMarkings(buf, roads, holeCells, baseY, pre?.dashes);
  for (const [isMain, bridge, flat] of data.rails || []) {
    if (bridge) continue;
    const pts = unflat(flat);
    ribbon(buf, pts, isMain ? RAIL_BALLAST_MAIN_W : RAIL_BALLAST_SIDE_W, baseY + 0.02, hex(PAL.ballast));
    ribbon(buf, pts, isMain ? RAIL_TRACK_MAIN_W : RAIL_TRACK_SIDE_W, baseY + 0.03, hex(PAL.rail));
  }

  const mesh = new THREE.Mesh(buf.geometry(), overlayMaterial(1));
  mesh.receiveShadow = true;
  mesh.renderOrder = 2;
  group.add(mesh);

  buildBridgeDecks(data, roads, profiles, structures, casing, roadCols);
  const lamps = buildStreetLamps(data, roads, profiles, group);
  return { lamps, marks: { roads, cw: carriageways, holes, holeCells, paved, dashes, slivers: sliverList } };
}
