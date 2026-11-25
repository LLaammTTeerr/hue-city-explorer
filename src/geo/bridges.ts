import { LAND_Y, ROAD_MAX, ROAD_W } from '../config.ts';
import { rise, waterY } from './terrain.ts';
import { inRing, pathLength, unflat } from './buf.ts';

// The vertical profile of every generic road bridge: the deck rises from each bank to a crown at mid-span, as the
// small bridges of Huế do, instead of lying as a flat slab. Shared by geo/city-roads.ts (the slab, piers, parapets,
// lamps) and landmarks/life (traffic and lamp posts ride on the same curve).

const DECIMETRES_PER_METRE = 10;
const RUN_FLAT_M = 150; // a bridge run longer than this keeps its level deck
export const STREET = 0.06;
const DECK_OFFSET_M = 0.42;
export const LAND_RAMP = 6; // m: a deck's last stretch, where it comes down from DECK to the street
export const ABUT = 1.8; // a `water` bridge's abutment: the deck lands this far past the water's edge
const CITADEL_DECK_THICK_M = 0.55;
const FOOTWAY_M = 2.1;
const CROSS_PAD_M = 0.3;
const CROSS_SEARCH_MARGIN_M = 30;
const GRADE_EASE_M = 5;
const GRADE_BLEND_M = 14;
const GRADE_STEP_M = 0.5;
const UNNAMED_MATCH_DIST_M = 4;

const NAMED_BRIDGES: Record<string, any> = {
  'Cầu Trung Đạo': { own: true },
  'Đông Thành Thủy Quan': { rise: 4.3, ramp: 0.45 },
  'Cầu Gia Hội': { rise: 0.5, water: true, lit: 5 },
  'Cầu Cửa Ngăn': { rise: 1.0 },
  'Cầu Phú Xuân': { rise: 2.1, ends: { south: [0.05, 30], north: [0.022, 50] }, lamps: { step: 30, at: 9.9, head: 7.4, h: 9.3, own: 'phuxuan' } },
  'Cầu Dã Viên': { rise: 2.0, ramp: 0.12 },
  'Cầu Trường Tiền': { rise: 0 },
  'Cầu Nguyễn Hoàng': { rise: 0 },
};

const UNNAMED_BY_POINT = [
  { p: [-1347.6, -1299.9], rise: 0.15 },
];

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
// 0 at both banks, 1 at mid-span; level where it meets the road, round at the crown
export const hump = (t: number) => (1 - Math.cos(2 * Math.PI * clamp(t, 0, 1))) / 2;

const litCache = new WeakMap<object, { ring: [number, number][]; pad: number }[]>();
export function ownLit(data: any, x: number, z: number) {
  let rings = litCache.get(data);
  if (!rings) {
    rings = (data.bridges || [])
      .filter((entry: any) => entry.n && NAMED_BRIDGES[entry.n]?.lit)
      .map((entry: any) => ({ ring: unflat(entry.ring), pad: NAMED_BRIDGES[entry.n].lit }));
    litCache.set(data, rings);
  }
  for (const { ring, pad } of rings) {
    if (inRing(x, z, ring)) return true;
    for (let i = 0; i < ring.length; i++) {
      const p0 = ring[i], p1 = ring[(i + 1) % ring.length];
      const dx = p1[0] - p0[0], dz = p1[1] - p0[1], lenSq = dx * dx + dz * dz;
      const frac = lenSq ? clamp(((x - p0[0]) * dx + (z - p0[1]) * dz) / lenSq, 0, 1) : 0;
      if (Math.hypot(p0[0] + dx * frac - x, p0[1] + dz * frac - z) < pad) return true;
    }
  }
  return false;
}

function groupBridgeRuns(list: any[]) {
  const endpointKey = (pt: number[]) => `${Math.round(pt[0])},${Math.round(pt[1])}`;
  const byEndpoint = new Map<string, number[]>();
  list.forEach((bridge, idx) => {
    for (const pt of [bridge.pts[0], bridge.pts[bridge.pts.length - 1]]) {
      const key = endpointKey(pt);
      if (!byEndpoint.has(key)) byEndpoint.set(key, []);
      byEndpoint.get(key)!.push(idx);
    }
  });
  const runOf = new Array<number>(list.length).fill(-1);
  const runLen: number[] = [];
  const runCount: number[] = [];
  list.forEach((_, startIdx) => {
    if (runOf[startIdx] >= 0) return;
    const runId = runLen.length;
    const stack = [startIdx];
    let totalLen = 0, pieces = 0;
    runOf[startIdx] = runId;
    while (stack.length) {
      const idx = stack.pop()!;
      const bridge = list[idx];
      totalLen += bridge.len;
      pieces++;
      for (const pt of [bridge.pts[0], bridge.pts[bridge.pts.length - 1]]) {
        for (const nextIdx of byEndpoint.get(endpointKey(pt)) || []) {
          if (runOf[nextIdx] < 0 && (list[nextIdx].c >= 4) === (bridge.c >= 4)) {
            runOf[nextIdx] = runId;
            stack.push(nextIdx);
          }
        }
      }
    }
    runLen.push(totalLen);
    runCount.push(pieces);
  });
  return { runOf, runLen, runCount };
}

let profileCache: { data: any; map: Map<any, any> } | null = null;
// Map from a road's flat coordinate array (data.roads[i][2]) to its deck profile.
export function bridgeProfiles(data: any) {
  if (profileCache && profileCache.data === data) return profileCache.map;
  const map = new Map();
  const list: any[] = [];
  for (const road of data.roads || []) {
    if (!Array.isArray(road) || !road[1] || !Array.isArray(road[2]) || road[2].length < 4) continue;
    const pts = unflat(road[2]);
    list.push({ c: Math.max(0, Math.min(ROAD_MAX, road[0] | 0)), citadel: road[1] === 2, flat: road[2], pts, len: pathLength(pts) });
  }

  const { runOf, runLen, runCount } = groupBridgeRuns(list);
  const namedPolys = data.bridges || [];
  const pending: any[] = [];
  const waterGroups = new Map<string, any[]>();

  list.forEach((bridge, idx) => {
    const first = bridge.pts[0], last = bridge.pts[bridge.pts.length - 1];
    const mid = [(first[0] + last[0]) / 2, (first[1] + last[1]) / 2];
    let named: string | null = null;
    for (const poly of namedPolys) {
      if (poly.n && NAMED_BRIDGES[poly.n] && inRing(mid[0], mid[1], unflat(poly.ring))) { named = poly.n; break; }
    }
    if (named && NAMED_BRIDGES[named].own) return;

    let crownRise: number;
    let arches = 0, ramp = 0, vaults: number[] | null = null, endSpec: any = null;
    const unnamedMatch = !named ? UNNAMED_BY_POINT.find((entry) => Math.hypot(entry.p[0] - mid[0], entry.p[1] - mid[1]) < UNNAMED_MATCH_DIST_M) : null;
    if (named) ({ rise: crownRise, arches = 0, ramp = 0, ends: endSpec = null } = NAMED_BRIDGES[named]);
    else if (unnamedMatch) crownRise = unnamedMatch.rise;
    else if (bridge.citadel) ({ riseM: crownRise, arches, vaults } = citadelRule(data, bridge));
    else if (runLen[runOf[idx]] > RUN_FLAT_M || bridge.len > RUN_FLAT_M || runCount[runOf[idx]] > 1) crownRise = 0;
    else if (bridge.c >= 4) crownRise = clamp(bridge.len / 14, 0.5, 1.5);
    else crownRise = clamp(bridge.len * 0.02, 0.4, 1.1);

    const item = { b: bridge, named, r: crownRise, arches, ramp, span: null, vaults, shape: endSpec ? endGrades(bridge.pts, bridge.len, crownRise, endSpec) : null };
    pending.push(item);
    if (named && NAMED_BRIDGES[named].water) {
      if (!waterGroups.has(named)) waterGroups.set(named, []);
      waterGroups.get(named)!.push(item);
    }
  });

  for (const ways of waterGroups.values()) waterSpans(data, ways);
  for (const { b, named, r, arches, ramp, span, vaults, shape } of pending) {
    const profile = makeProfile(b.pts, b.len, b.c, r, arches, ramp, span, vaults, shape);
    map.set(
      b.flat,
      Object.assign(profile, { name: named, citadel: !!vaults && !named }, named && NAMED_BRIDGES[named].lamps && b.c <= 2 ? { lamps: NAMED_BRIDGES[named].lamps } : {}),
    );
  }
  profileCache = { data, map };
  return map;
}

function citadelRule(data: any, bridge: { pts: number[][]; len: number }) {
  const { pts, len } = bridge;
  let firstWet: number | null = null;
  let lastWet: number | null = null;
  for (let dist = 0; dist <= len + 1e-6; dist += 0.5) {
    const { x, z } = pointAtDist(pts, dist);
    if (rise(x, z) > 0.05 || onLand(data, x, z)) continue;
    if (firstWet === null) firstWet = dist;
    lastWet = dist;
  }
  const riseM = clamp(len / 10, 1.2, 2.2);
  if (firstWet === null || lastWet! - firstWet < 2) return { riseM, arches: 0, vaults: [] };
  const wetSpan = lastWet! - firstWet;
  const arches = wetSpan > 22 ? 3 : 1;
  const start = clamp(firstWet - 0.6, len * 0.12, len * 0.5 - 1);
  const end = clamp(lastWet! + 0.6, len * 0.5 + 1, len * 0.88);
  return { riseM, arches, vaults: [start, end] };
}

export function onLand(data: any, x: number, z: number) {
  let inside = false;
  for (const poly of data.land || []) {
    for (const ring of poly) if (inRingFlat(x * DECIMETRES_PER_METRE, z * DECIMETRES_PER_METRE, ring)) inside = !inside;
  }
  return inside;
}

function inRingFlat(x: number, z: number, ring: number[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

function waterSpans(data: any, ways: any[]) {
  const p0 = ways[0].b.pts[0];
  const p1 = ways[0].b.pts[ways[0].b.pts.length - 1];
  const axisLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
  const axisDir = [(p1[0] - p0[0]) / axisLen, (p1[1] - p0[1]) / axisLen];
  const projectU = (x: number, z: number) => (x - p0[0]) * axisDir[0] + (z - p0[1]) * axisDir[1];

  let spanStartU = -Infinity;
  let spanEndU = Infinity;
  for (const way of ways) {
    const { pts, len } = way.b;
    let firstWet: number | null = null, lastWet: number | null = null;
    way.samples = [];
    for (let dist = 0; dist <= len + 1e-6; dist += 0.25) {
      const { x, z } = pointAtDist(pts, dist);
      const u = projectU(x, z);
      way.samples.push([dist, u]);
      if (rise(x, z) > 0.05 || onLand(data, x, z)) continue;
      if (firstWet === null || u < firstWet) firstWet = u;
      if (lastWet === null || u > lastWet) lastWet = u;
    }
    const minU = Math.min(...way.samples.map((entry: number[]) => entry[1]));
    const maxU = Math.max(...way.samples.map((entry: number[]) => entry[1]));
    if (firstWet === null || lastWet! - firstWet < 4) return;
    spanStartU = Math.max(spanStartU, minU, firstWet - ABUT);
    spanEndU = Math.min(spanEndU, maxU, lastWet! + ABUT);
  }
  if (!(spanEndU - spanStartU > 4)) return;

  const isCrossing = crossingStreets(data, ways);
  const midU = (spanStartU + spanEndU) / 2;
  for (const way of ways) {
    const { pts } = way.b;
    const halfWidth = ROAD_W[way.b.c] / 2 + FOOTWAY_M;
    for (const [dist, u] of way.samples) {
      const { x, z } = pointAtDist(pts, dist);
      const prev = pointAtDist(pts, Math.max(0, dist - 0.5));
      const next = pointAtDist(pts, dist + 0.5);
      const segLen = Math.hypot(next.x - prev.x, next.z - prev.z) || 1;
      const nx = -(next.z - prev.z) / segLen, nz = (next.x - prev.x) / segLen;
      if (![0, -halfWidth, halfWidth].some((off) => isCrossing(x + nx * off, z + nz * off))) continue;
      if (u > midU) spanEndU = Math.min(spanEndU, u - 0.25);
      else spanStartU = Math.max(spanStartU, u + 0.25);
    }
  }
  if (!(spanEndU - spanStartU > 4)) return;

  for (const way of ways) {
    const distAtU = (targetU: number) => {
      let best = way.samples[0];
      for (const sample of way.samples) if (Math.abs(sample[1] - targetU) < Math.abs(best[1] - targetU)) best = sample;
      return best[0];
    };
    const d0 = distAtU(spanStartU), d1 = distAtU(spanEndU), len = way.b.len;
    const snapEnd = (val: number) => (val < 0.3 ? 0 : val > len - 0.3 ? len : val);
    way.span = [snapEnd(Math.min(d0, d1)), snapEnd(Math.max(d0, d1))];
    delete way.samples;
  }
}

function crossingStreets(data: any, ways: any[]) {
  const endpoints = ways.flatMap((way) => [way.b.pts[0], way.b.pts[way.b.pts.length - 1]]);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const way of ways) {
    for (const pt of way.b.pts) {
      x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]);
      z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]);
    }
  }
  const segs: number[][] = [];
  for (const road of data.roads || []) {
    if (!Array.isArray(road) || road[1] || !Array.isArray(road[2]) || road[2].length < 4 || (road[0] | 0) > 3) continue;
    const flat = road[2], count = flat.length;
    const touchesEnd = [[flat[0] / DECIMETRES_PER_METRE, flat[1] / DECIMETRES_PER_METRE], [flat[count - 2] / DECIMETRES_PER_METRE, flat[count - 1] / DECIMETRES_PER_METRE]]
      .some((pt) => endpoints.some((end) => Math.hypot(pt[0] - end[0], pt[1] - end[1]) < 1.5));
    if (touchesEnd) continue;
    for (let i = 0; i + 3 < count; i += 2) {
      const ax = flat[i] / DECIMETRES_PER_METRE, az = flat[i + 1] / DECIMETRES_PER_METRE;
      const bx = flat[i + 2] / DECIMETRES_PER_METRE, bz = flat[i + 3] / DECIMETRES_PER_METRE;
      if (Math.max(ax, bx) < x0 - CROSS_SEARCH_MARGIN_M || Math.min(ax, bx) > x1 + CROSS_SEARCH_MARGIN_M || Math.max(az, bz) < z0 - CROSS_SEARCH_MARGIN_M || Math.min(az, bz) > z1 + CROSS_SEARCH_MARGIN_M) continue;
      segs.push([ax, az, bx, bz, ROAD_W[road[0] | 0] / 2 + CROSS_PAD_M]);
    }
  }
  return (x: number, z: number) => segs.some(([ax, az, bx, bz, halfW]) => {
    const dx = bx - ax, dz = bz - az, lenSq = dx * dx + dz * dz;
    const frac = lenSq ? clamp(((x - ax) * dx + (z - az) * dz) / lenSq, 0, 1) : 0;
    return Math.hypot(ax + dx * frac - x, az + dz * frac - z) < halfW;
  });
}

function pointAtDist(pts: number[][], dist: number) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (dist <= segLen || i + 2 === pts.length) {
      const frac = segLen ? clamp(dist / segLen, 0, 1) : 0;
      return { x: p0[0] + (p1[0] - p0[0]) * frac, z: p0[1] + (p1[1] - p0[1]) * frac };
    }
    dist -= segLen;
  }
  return { x: pts[0][0], z: pts[0][1] };
}

function endGrades(pts: number[][], len: number, riseM: number, ends: { south: [number, number]; north: [number, number] }) {
  const halfLen = len / 2;
  const southFirst = pts[0][1] > pts[pts.length - 1][1];
  const buildHalf = ([grade, run]: [number, number]) => {
    const clampedRun = Math.min(run, halfLen * 0.6);
    const blendLen = Math.min(GRADE_BLEND_M, halfLen - clampedRun);
    const tailLen = halfLen - clampedRun - blendLen;
    const fixedRise = (grade * GRADE_EASE_M) / 2 + grade * (clampedRun - GRADE_EASE_M) + (grade * blendLen) / 2;
    const perUnit = blendLen / 2 + tailLen / 2;
    const lowerGrade = clamp((riseM - fixedRise) / (perUnit || 1), 0, grade);
    const slopeAt = (dist: number) => (
      dist < GRADE_EASE_M ? (grade * dist) / GRADE_EASE_M
        : dist < clampedRun ? grade
          : dist < clampedRun + blendLen ? grade + ((lowerGrade - grade) * (dist - clampedRun)) / blendLen
            : lowerGrade * Math.max(0, 1 - (dist - clampedRun - blendLen) / (tailLen || 1))
    );
    const table = [0];
    for (let dist = GRADE_STEP_M; dist <= halfLen + GRADE_STEP_M; dist += GRADE_STEP_M) {
      table.push(table[table.length - 1] + 0.25 * (slopeAt(dist - GRADE_STEP_M) + slopeAt(dist)));
    }
    return (dist: number) => {
      const pos = clamp(dist / GRADE_STEP_M, 0, table.length - 1);
      const idx = Math.floor(pos);
      const frac = pos - idx;
      return table[idx] + (table[Math.min(idx + 1, table.length - 1)] - table[idx]) * frac;
    };
  };
  const halfSouth = buildHalf(ends.south);
  const halfNorth = buildHalf(ends.north);
  const firstHalf = southFirst ? halfSouth : halfNorth;
  const secondHalf = southFirst ? halfNorth : halfSouth;
  const midFirst = firstHalf(halfLen);
  const midSecond = secondHalf(halfLen);
  return (dist: number) => {
    const clamped = clamp(dist, 0, len);
    const height = clamped <= halfLen ? firstHalf(clamped) : secondHalf(len - clamped);
    const mismatch = clamped <= halfLen ? midFirst : midSecond;
    return height + (riseM - mismatch) * (clamped <= halfLen ? clamped / halfLen : (len - clamped) / halfLen);
  };
}

function makeProfile(pts: number[][], len: number, roadClass: number, riseM: number, arches: number, climb = 0, span: number[] | null = null, zone: number[] | null = null, shape: ((s: number) => number) | null = null) {
  const p0 = pts[0], pEnd = pts[pts.length - 1], midPt = pts[pts.length >> 1];
  const rise0 = rise(p0[0], p0[1]), riseEnd = rise(pEnd[0], pEnd[1]);
  const lift = Math.min(rise0, riseEnd);
  const top = LAND_Y + lift + DECK_OFFSET_M;
  const isSloped = Math.abs(rise0 - riseEnd) > 0.25;
  const base = isSloped ? (s: number) => LAND_Y + rise0 + DECK_OFFSET_M + ((riseEnd - rise0) * s) / (len || 1) : () => top;
  const smooth01 = (val: number) => { const u = clamp(val, 0, 1); return u * u * (3 - 2 * u); };
  const streetDrop = STREET - DECK_OFFSET_M;

  const baseBump = shape
    ? (s: number) => streetDrop + shape(s)
    : span
      ? (s: number) => (s <= span[0] || s >= span[1] ? streetDrop : streetDrop + riseM * hump((s - span[0]) / (span[1] - span[0])))
      : climb
        ? (s: number) => { const t = s / (len || 1); return riseM * smooth01(t / climb) * smooth01((1 - t) / climb) * (0.82 + 0.18 * hump(t)); }
        : (s: number) => riseM * hump(s / (len || 1));

  let bump = baseBump;
  const breaks = span ? [...span] : [];
  if (roadClass <= 5 && !span && (!arches || zone)) {
    const rampLen = Math.min(LAND_RAMP, len * 0.2);
    const streetY = (pt: number[]) => LAND_Y + STREET + rise(pt[0], pt[1]) + (rise(pt[0], pt[1]) > 0 ? 0.12 : 0);
    const diff0 = streetY(p0) - base(0) - baseBump(0);
    const diffEnd = streetY(pEnd) - base(len) - baseBump(len);
    const k0 = Math.abs(diff0) < 0.8 ? diff0 : 0;
    const kEnd = Math.abs(diffEnd) < 0.8 ? diffEnd : 0;
    if (k0 || kEnd) {
      bump = (s: number) => baseBump(s) + k0 * (1 - smooth01(s / rampLen)) + kEnd * (1 - smooth01((len - s) / rampLen));
      for (const s of [rampLen * 0.5, rampLen, len - rampLen, len - rampLen * 0.5]) if (s > 0 && s < len) breaks.push(s);
    }
  }

  const thick = zone ? CITADEL_DECK_THICK_M : roadClass <= 2 ? 1.3 : 0.7;
  const prof: Record<string, any> = { len, c: roadClass, rise: riseM, arches, top, lift, thick, base, bump, y: (s: number) => base(s) + bump(s), breaks, span };
  if (arches) {
    const spring = waterY(midPt[0], midPt[1]) + 0.15;
    const z0 = zone && zone.length ? zone[0] : len * (arches === 1 ? 0.24 : 0.12);
    const z1 = zone && zone.length ? zone[1] : len - z0;
    const pier = arches === 1 ? 0 : Math.max(0.9, ((z1 - z0) / arches) * 0.22);
    const archSpan = (z1 - z0 - pier * (arches - 1)) / arches;
    const vaults: [number, number, number][] = [];
    for (let k = 0; k < arches; k++) {
      const a = z0 + k * (archSpan + pier), b = a + archSpan;
      const archH = Math.min(archSpan * 0.5, prof.y((a + b) / 2) - thick - (zone ? 0 : 0.3) - spring);
      if (archH > 0.5) { vaults.push([a, b, archH]); prof.breaks.push(a, a + 0.12, b - 0.12, b); }
    }
    prof.vaults = vaults.map(([a, b, h]) => ({ a, b, h, spring }));
    prof.spring = spring;
    prof.bottom = (s: number) => {
      const deckBot = prof.y(s) - thick;
      for (const [a, b, h] of vaults) {
        if (s > a && s < b) {
          const u = (2 * (s - a)) / (b - a) - 1;
          return Math.min(deckBot, spring + h * Math.sqrt(Math.max(0, 1 - u * u)));
        }
      }
      return spring - 2.2;
    };
  }
  return prof;
}

export function resample(pts: number[][], step: number, breaks: number[] = []) {
  const out: number[][] = [pts[0]];
  const arcPos = [0];
  const sortedBreaks = [...breaks].sort((a, b) => a - b);
  let acc = 0, breakIdx = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (segLen < 1e-6) continue;
    const cuts: number[] = [];
    const subdivs = Math.max(1, Math.ceil(segLen / step));
    for (let k = 1; k < subdivs; k++) cuts.push((segLen * k) / subdivs);
    while (breakIdx < sortedBreaks.length && sortedBreaks[breakIdx] < acc + segLen) {
      if (sortedBreaks[breakIdx] > acc + 0.02) cuts.push(sortedBreaks[breakIdx] - acc);
      breakIdx++;
    }
    cuts.sort((a, b) => a - b);
    let lastCut = 0;
    for (const cut of cuts) {
      if (cut - lastCut < 0.02 || segLen - cut < 0.02) continue;
      out.push([p0[0] + ((p1[0] - p0[0]) * cut) / segLen, p0[1] + ((p1[1] - p0[1]) * cut) / segLen]);
      arcPos.push(acc + cut);
      lastCut = cut;
    }
    acc += segLen;
    out.push(p1);
    arcPos.push(acc);
  }
  return { pts: out, s: arcPos };
}

export function subPath(pts: number[][], s0: number, s1: number) {
  const out: number[][] = [];
  let acc = 0;
  const lerp2 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (acc + segLen >= s0 && acc <= s1 && segLen > 1e-9) {
      if (!out.length) out.push(lerp2(p0, p1, clamp((s0 - acc) / segLen, 0, 1)));
      if (acc + segLen <= s1) out.push(p1);
      else { out.push(lerp2(p0, p1, clamp((s1 - acc) / segLen, 0, 1))); break; }
    }
    acc += segLen;
  }
  return out;
}

export function bridgeLamps(profile: any, pts: number[][]) {
  const lampCfg = profile && profile.lamps;
  if (!lampCfg) return [];
  const out: any[] = [];
  for (let dist = lampCfg.step / 2; dist <= profile.len - lampCfg.step / 2 + 1; dist += lampCfg.step) {
    const prev = pointAtDist(pts, Math.max(0, dist - 0.5));
    const next = pointAtDist(pts, Math.min(profile.len, dist + 0.5));
    const mid = pointAtDist(pts, dist);
    const segLen = Math.hypot(next.x - prev.x, next.z - prev.z) || 1;
    const norm = [-(next.z - prev.z) / segLen, (next.x - prev.x) / segLen];
    const y = Math.max(LAND_Y + DECK_OFFSET_M, profile.base(dist)) + profile.bump(dist);
    out.push({
      s: dist,
      y,
      sides: [-1, 1].map((side) => ({
        k: side,
        n: [norm[0] * side, norm[1] * side],
        foot: [mid.x + norm[0] * side * lampCfg.at, mid.z + norm[1] * side * lampCfg.at],
        head: [mid.x + norm[0] * side * lampCfg.head, mid.z + norm[1] * side * lampCfg.head],
      })),
    });
  }
  return out;
}
