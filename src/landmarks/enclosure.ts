import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { KIND, Buf, hex, shade } from '../geo/buf.ts';
import { LAND_Y } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../geo/materials.ts';

// Walls, railings and gates around the grounds of the city landmarks (Quốc Học, the churches, Ga Huế's forecourt,
// cung An Định, chùa Diệu Đế, the Thế Miếu compound), and the night lighting of those landmarks.
//
// A fence follows a ring (or an open line) from its own ground, bay by bay, and opens wherever a road or path of
// `data.roads` crosses it (as `crossings()` in tombs.js does) and wherever a gate model stands (`openings`).

const groundY = (x, z) => LAND_Y + rise(x, z);
const ROAD_WIDTHS = [15, 12, 9.5, 6.5, 4, 2.2]; // carriageway width by road class
const STREET_MAX_CLASS = 3;
const STRIP_CAP_SEGS = 6;
const SOLID_SAMPLE_STEP = 0.25;
const FOOTING_DEPTH = 0.4;
const YARD_STREET_PAD = 1.5;
const YARD_BLD_PAD = 1.2;
const YARD_RELAX_PASSES = 4;

// ---- night: one group handed to the scene's `dynamic` group by buildNguyenHoang (more.js), which main.js builds
// before every other landmark of these files; main.js gathers glows from `dynamic` only after
// all landmarks are built, so what is added here later is still picked up. ----
export const night = new THREE.Group();
night.name = 'civic-night';
const lampSets = new Map();

// a warm point light, shown after dark
export function lamp(x, y, z, col = [1, 0.8, 0.5], size = 4) {
  if (!lampSets.has(size)) lampSets.set(size, { size, pos: [], col: [] });
  const bucket = lampSets.get(size);
  bucket.pos.push(x, y, z);
  bucket.col.push(col[0], col[1], col[2]);
}

// a strip of architectural light (geometry built in `buf`, a Buf)
export function strips(buf, color, boost = 1.6) {
  if (!buf || buf.n === 0) return;
  const mesh = new THREE.Mesh(buf.geometry(), lightMaterial(color, boost));
  mesh.renderOrder = 19;
  mesh.userData.landmark = true; // counts towards label heights (scripts/lib/label-tops.mjs)
  night.add(mesh);
}

export function flushLamps() {
  for (const bucket of lampSets.values()) {
    if (!bucket.pos.length) continue;
    const points = glowPoints(bucket.pos, bucket.col, bucket.size);
    points.userData.glow = true;
    night.add(points);
  }
  lampSets.clear();
}

// ---- roads near a place, as segments [ax, az, bx, bz, width, class] ----
export function roadsNear(data, center, radius) {
  const out = [];
  for (const [roadClass, bridge, flat] of data.roads || []) {
    if (bridge) continue;
    for (let i = 0; i + 3 < flat.length; i += 2) {
      const ax = flat[i] / 10, az = flat[i + 1] / 10, bx = flat[i + 2] / 10, bz = flat[i + 3] / 10;
      const mx = (ax + bx) / 2 - center[0];
      const mz = (az + bz) / 2 - center[1];
      const halfLen = Math.hypot(bx - ax, bz - az) / 2;
      if (Math.hypot(mx, mz) < radius + halfLen) out.push([ax, az, bx, bz, ROAD_WIDTHS[roadClass] || 2.2, roadClass]);
    }
  }
  return out;
}

// Is (x, z) on a mapped street near center? Streets are the classes city.js gives kerbs and pavements (0-3).
export const PAVEMENT = (roadClass) => (roadClass <= 2 ? 1.8 : 1.2);
export function streetTest(data, center, radius) {
  const segs = roadsNear(data, center, radius).filter((seg) => seg[5] <= STREET_MAX_CLASS);
  return (x: number, z: number, pad: number | 'pavement' = 0) => segs.some(([ax, az, bx, bz, width, roadClass]) => {
    const dx = bx - ax, dz = bz - az, lenSq = dx * dx + dz * dz;
    const param = lenSq ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq)) : 0;
    return Math.hypot(ax + dx * param - x, az + dz * param - z) < width / 2 + (pad === 'pavement' ? PAVEMENT(roadClass) : pad);
  });
}

function signedArea(ring) {
  let acc = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    acc += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return acc / 2;
}

// A mapped outline (a precinct, a terrace) kept off the streets, as build-data.mjs trims mapped buildings: the ring
// less each street's carriageway plus `pad`, its largest piece kept.
export function offStreets(data, ring, pad = 0.3) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const pt of ring) {
    x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]);
    z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]);
  }
  const center = [(x0 + x1) / 2, (z0 + z1) / 2];
  const radius = Math.hypot(x1 - x0, z1 - z0) / 2 + 10;
  const roadStrips = [];
  for (const [ax, az, bx, bz, width, roadClass] of roadsNear(data, center, radius)) {
    if (roadClass > STREET_MAX_CLASS) continue;
    const halfW = width / 2 + pad;
    const segLen = Math.hypot(bx - ax, bz - az) || 1;
    const ux = (bx - ax) / segLen, uz = (bz - az) / segLen;
    const nx = -uz, nz = ux;
    const capsule = [];
    for (const [endPt, capSign] of [[[bx, bz], 1], [[ax, az], -1]] as [[number, number], number][]) {
      for (let k = 0; k <= STRIP_CAP_SEGS; k++) {
        const theta = (k * Math.PI) / STRIP_CAP_SEGS;
        const cs = Math.cos(theta) * capSign;
        const sn = Math.sin(theta) * capSign;
        capsule.push([endPt[0] + halfW * (cs * nx + sn * ux), endPt[1] + halfW * (cs * nz + sn * uz)]);
      }
    }
    if (Math.max(ax, bx) + halfW > x0 && Math.min(ax, bx) - halfW < x1 && Math.max(az, bz) + halfW > z0 && Math.min(az, bz) - halfW < z1) {
      roadStrips.push([[...capsule, capsule[0]]]);
    }
  }
  if (!roadStrips.length) return ring;
  let clipped;
  try { clipped = polygonClipping.difference([[...ring, ring[0]]], ...roadStrips); } catch { return ring; }
  let best = null;
  for (const poly of clipped) {
    const outer = poly[0].slice(0, -1);
    if (!best || Math.abs(signedArea(outer)) > Math.abs(signedArea(best))) best = outer;
  }
  if (!best) return ring;
  return Math.sign(signedArea(best)) === Math.sign(signedArea(ring)) ? best : best.reverse();
}

// A ring (a lawn, a court) cut to the part inside `bound`, its largest piece kept, in the ring's own winding.
export function clipTo(ring, bound) {
  let clipped;
  try { clipped = polygonClipping.intersection([[...ring, ring[0]]], [[...bound, bound[0]]]); } catch { return ring; }
  let best = null;
  for (const poly of clipped) {
    const outer = poly[0].slice(0, -1);
    if (!best || Math.abs(signedArea(outer)) > Math.abs(signedArea(best))) best = outer;
  }
  if (!best || best.length < 3) return null;
  return Math.sign(signedArea(best)) === Math.sign(signedArea(ring)) ? best : best.reverse();
}

// where along segA -> segB (0..1) roads cross or gates stand, as merged [from, to] gaps
function gapsOf(segA, segB, len, roads, openings) {
  const dx = segB[0] - segA[0], dz = segB[1] - segA[1];
  const gaps = [];
  for (const [px, pz, qx, qz, width] of roads) {
    const ex = qx - px, ez = qz - pz, den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const hitU = ((px - segA[0]) * ez - (pz - segA[1]) * ex) / den;
    const hitV = ((px - segA[0]) * dz - (pz - segA[1]) * dx) / den;
    if (hitU < 0 || hitU > 1 || hitV < 0 || hitV > 1) continue;
    const sinAng = Math.abs(den) / (len * Math.hypot(ex, ez));
    const halfSpan = Math.min(8, (width / 2 + 0.8) / Math.max(0.35, sinAng)) / len;
    gaps.push([hitU - halfSpan, hitU + halfSpan]);
  }
  for (const [x, z, halfW] of openings) {
    const param = ((x - segA[0]) * dx + (z - segA[1]) * dz) / (len * len);
    const px = segA[0] + dx * param, pz = segA[1] + dz * param;
    if (Math.hypot(x - px, z - pz) > 4 || param < -halfW / len || param > 1 + halfW / len) continue;
    gaps.push([param - halfW / len, param + halfW / len]);
  }
  gaps.sort((gapA, gapB) => gapA[0] - gapB[0]);
  const merged = [];
  for (const gap of gaps) {
    const prev = merged[merged.length - 1];
    if (prev && gap[0] <= prev[1] + 1.5 / len) prev[1] = Math.max(prev[1], gap[1]);
    else merged.push(gap.slice());
  }
  return merged;
}

export const FENCE = {
  quochoc: { h: 2.25, plinth: 1.75, rail: true, t: 0.36, every: 7.2, postW: 0.62, postUp: 0.3, wall: hex('#8e3a31'), cap: hex('#e6d8b8'), iron: hex('#3a403c'), pierW: 1.0, pierUp: 1.2, lattice: [0.95, 1.55], screen: hex('#dcd8cf'), bars: 0.3, barW: 0.016, midRail: false, railW: 0.03, railH: 0.035 },
  church: { h: 1.9, plinth: 0.7, rail: true, t: 0.32, every: 3.2, postW: 0.45, postUp: 0.18, wall: hex('#e4ddcd'), cap: hex('#b9b5ab'), iron: hex('#2a2d30'), pierW: 1.0, pierUp: 1.5 },
  andinh: { h: 2.2, plinth: 0.8, rail: true, t: 0.4, every: 3.6, postW: 0.55, postUp: 0.3, wall: hex('#d7b062'), cap: hex('#f3e8d2'), iron: hex('#3a3328'), pierW: 1.2, pierUp: 1.6 },
  pagoda: { h: 2.1, plinth: 2.1, rail: false, t: 0.38, every: 4.0, postW: 0.55, postUp: 0.35, wall: hex('#e0c072'), cap: hex('#9c4c37'), iron: null, pierW: 0.9, pierUp: 1.4 },
  imperial: { h: 3.0, plinth: 3.0, rail: false, t: 0.6, every: 6.0, postW: 0.8, postUp: 0.3, wall: hex('#b8945e'), cap: hex('#c79a3a'), iron: null, pierW: 1.3, pierUp: 1.5 },
  station: { h: 1.1, plinth: 0.35, rail: true, t: 0.26, every: 2.8, postW: 0.32, postUp: 0.15, wall: hex('#e9e1d0'), cap: hex('#f5efe2'), iron: hex('#3b4a44'), pierW: 0.7, pierUp: 1.0 },
};

const inRing = (x, z, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (ring[i][1] > z !== ring[j][1] > z && x < ((ring[j][0] - ring[i][0]) * (z - ring[i][1])) / (ring[j][1] - ring[i][1]) + ring[i][0]) {
      inside = !inside;
    }
  }
  return inside;
};

// mapped building outlines near a place (where a fence meets a gatehouse or a lodge, the building stands in the line)
export function buildingsNear(data, center, radius) {
  const out = [];
  for (const bld of data.bld || []) {
    const flat = bld[0];
    if (Math.hypot(flat[0] / 10 - center[0], flat[1] / 10 - center[1]) > radius + 60) continue;
    const ring = [];
    for (let i = 0; i < flat.length; i += 2) ring.push([flat[i] / 10, flat[i + 1] / 10]);
    out.push(ring);
  }
  return out;
}

// the stretches of segA-segB (as fractions) inside any of the outlines, or within `pad` of the line beside it
function solidSpans(segA, segB, len, solid, pad) {
  const out = [];
  if (!solid.length) return out;
  const near = solid.filter((ring) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of ring) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    return Math.max(segA[0], segB[0]) + pad > x0 && Math.min(segA[0], segB[0]) - pad < x1
      && Math.max(segA[1], segB[1]) + pad > z0 && Math.min(segA[1], segB[1]) - pad < z1;
  });
  if (!near.length) return out;
  const steps = Math.max(2, Math.ceil(len / SOLID_SAMPLE_STEP));
  const halfStep = 0.5 / steps;
  const nx = (-(segB[1] - segA[1]) / len) * pad;
  const nz = ((segB[0] - segA[0]) / len) * pad;
  let spanStart = -1;
  for (let j = 0; j <= steps; j++) {
    const frac = j / steps;
    const x = segA[0] + (segB[0] - segA[0]) * frac;
    const z = segA[1] + (segB[1] - segA[1]) * frac;
    const inside = near.some((ring) => inRing(x, z, ring) || inRing(x + nx, z + nz, ring) || inRing(x - nx, z - nz, ring));
    if (inside && spanStart < 0) spanStart = Math.max(0, frac - halfStep);
    if (!inside && spanStart >= 0) { out.push([spanStart, frac - halfStep]); spanStart = -1; }
  }
  if (spanStart >= 0) out.push([spanStart, 1]);
  return out;
}

function buildFenceBay(S, style, wallKind, bayStart, bayEnd, bayLen, ang) {
  const yStart = groundY(bayStart[0], bayStart[1]);
  const yEnd = groundY(bayEnd[0], bayEnd[1]);
  const lo = Math.min(yStart, yEnd) - FOOTING_DEPTH;
  const hi = Math.max(yStart, yEnd);
  const mx = (bayStart[0] + bayEnd[0]) / 2;
  const mz = (bayStart[1] + bayEnd[1]) / 2;
  S.base = lo + FOOTING_DEPTH - LAND_Y;
  S.kind = wallKind;
  if (style.rail) {
    S.box(mx, mz, lo, hi + style.plinth, bayLen, style.t, ang, style.wall, { top: style.cap });
    S.kind = KIND.PLAIN;
    if (style.lattice) {
      const panelCount = Math.max(1, Math.round((bayLen - style.postW) / 0.85));
      const panelW = (bayLen - style.postW) / panelCount;
      const latLo = hi + style.lattice[0];
      const latHi = hi + style.lattice[1];
      for (let j = 0; j < panelCount; j++) {
        const frac = (style.postW / 2 + (j + 0.5) * panelW) / bayLen;
        const px = bayStart[0] + (bayEnd[0] - bayStart[0]) * frac;
        const pz = bayStart[1] + (bayEnd[1] - bayStart[1]) * frac;
        S.box(px, pz, latLo, latHi, panelW - 0.16, style.t + 0.04, ang, style.screen);
        S.box(px, pz, latLo + 0.1, latHi - 0.1, panelW - 0.4, style.t + 0.06, ang, shade(style.screen, 0.62));
        S.box(px, pz, latLo + 0.14, latHi - 0.14, 0.09, style.t + 0.08, ang, style.screen);
        S.box(px, pz, (latLo + latHi) / 2 - 0.045, (latLo + latHi) / 2 + 0.045, panelW - 0.46, style.t + 0.08, ang, style.screen);
      }
    }
    const railH = style.railH ?? 0.12;
    if (style.bars) {
      const barCount = Math.max(1, Math.round((bayLen - style.postW) / style.bars));
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const barW = style.barW ?? 0.035;
      for (let j = 1; j < barCount; j++) {
        const offset = -bayLen / 2 + style.postW / 2 + ((bayLen - style.postW) * j) / barCount;
        S.box(mx + cosA * offset, mz + sinA * offset, hi + style.plinth, hi + style.h - Math.max(0.02, railH - 0.04), barW, barW, ang, style.iron);
      }
      if (style.midRail !== false) S.box(mx, mz, hi + style.plinth + 0.12, hi + style.plinth + 0.18, bayLen - style.postW, 0.05, ang, style.iron);
    } else {
      S.box(mx, mz, hi + style.plinth, hi + style.h - 0.08, bayLen - style.postW, 0.05, ang, style.iron);
    }
    S.box(mx, mz, hi + style.h - railH, hi + style.h, bayLen, style.railW ?? 0.09, ang, shade(style.iron, 1.2));
  } else {
    S.box(mx, mz, lo, hi + style.h - 0.18, bayLen + 0.02, style.t, ang, style.wall, { top: style.cap });
    S.kind = KIND.TILE;
    S.box(mx, mz, hi + style.h - 0.18, hi + style.h, bayLen + 0.05, style.t + 0.24, ang, style.cap, { taper: 0.55 });
  }
}

function buildGatePiers(S, style, wallKind, gaps, pointAt, ang, solid, piers) {
  for (const [gapStart, gapEnd] of gaps) {
    for (const frac of [gapStart, gapEnd]) {
      if (frac <= 0.005 || frac >= 0.995) continue;
      const pt = pointAt(frac);
      const y = groundY(pt[0], pt[1]);
      const top = y + style.h + style.pierUp;
      if (solid.some((ring) => inRing(pt[0], pt[1], ring))) continue;
      S.base = y - LAND_Y;
      S.kind = wallKind;
      S.box(pt[0], pt[1], y - FOOTING_DEPTH, top, style.pierW, style.pierW, ang, style.postCol || style.wall, { top: style.cap });
      S.kind = KIND.PLAIN;
      S.box(pt[0], pt[1], top, top + 0.18, style.pierW + 0.2, style.pierW + 0.2, ang, style.cap);
      S.box(pt[0], pt[1], top + 0.18, top + 0.5, style.pierW * 0.55, style.pierW * 0.55, ang, style.cap, { taper: 0.5 });
      piers.push([pt[0], pt[1], top + 0.5]);
    }
  }
}

export function fence(S, pts, style, { closed = true, roads = [], openings = [], solid = [], lampEvery = 0, lampCol = [1, 0.82, 0.55] } = {}) {
  const piers = [];
  const count = pts.length;
  const edgeCount = closed ? count : count - 1;
  const keepKind = S.kind;
  const keepBase = S.base;
  const wallKind = style.kind ?? KIND.MASONRY;
  let sinceLamp = 0;

  for (let i = 0; i < edgeCount; i++) {
    const segA = pts[i];
    const segB = pts[(i + 1) % count];
    const len = Math.hypot(segB[0] - segA[0], segB[1] - segA[1]);
    if (len < 0.4) continue;
    const ang = Math.atan2(segB[1] - segA[1], segB[0] - segA[0]);
    const pointAt = (frac) => [segA[0] + (segB[0] - segA[0]) * frac, segA[1] + (segB[1] - segA[1]) * frac];
    const gaps = gapsOf(segA, segB, len, roads, openings);
    const cuts = [...gaps, ...solidSpans(segA, segB, len, solid, style.t / 2 + 0.2)].sort((cutA, cutB) => cutA[0] - cutB[0]);
    const runs = [];
    let cursor = 0;
    for (const [cutStart, cutEnd] of cuts) {
      if (cutStart > cursor) runs.push([cursor, Math.min(1, cutStart)]);
      cursor = Math.max(cursor, cutEnd);
    }
    if (cursor < 1) runs.push([cursor, 1]);

    for (const [runStart, runEnd] of runs) {
      const runLen = (runEnd - runStart) * len;
      if (runLen < 0.6) continue;
      const bayCount = Math.max(1, Math.round(runLen / style.every));
      for (let k = 0; k < bayCount; k++) {
        const bayStart = pointAt(runStart + ((runEnd - runStart) * k) / bayCount);
        const bayEnd = pointAt(runStart + ((runEnd - runStart) * (k + 1)) / bayCount);
        buildFenceBay(S, style, wallKind, bayStart, bayEnd, runLen / bayCount, ang);
        const posts = !style.postW ? [] : k === bayCount - 1 ? [bayStart, bayEnd] : [bayStart];
        for (const postPt of posts) {
          const y = groundY(postPt[0], postPt[1]);
          S.kind = wallKind;
          S.box(postPt[0], postPt[1], y - FOOTING_DEPTH, y + style.h + style.postUp, style.postW, style.postW, ang, style.postCol || style.wall, { top: style.cap });
          if (k % 2 === 0) {
            S.kind = KIND.PLAIN;
            S.box(postPt[0], postPt[1], y + style.h + style.postUp, y + style.h + style.postUp + 0.12, style.postW + 0.12, style.postW + 0.12, ang, style.cap);
          }
          sinceLamp += 1;
          if (lampEvery && sinceLamp % lampEvery === 0) lamp(postPt[0], y + style.h + style.postUp + 0.35, postPt[1], lampCol, 3);
        }
      }
    }
    buildGatePiers(S, style, wallKind, gaps, pointAt, ang, solid, piers);
  }
  S.kind = keepKind;
  S.base = keepBase;
  return piers;
}

// An oriented yard around a building where OSM maps no grounds: a rectangle in frame terms (along f, across p)
// between [a0, a1] x [b0, b1], pulled in wherever a street (class 0-3) or mapped building runs through it,
// but never into the core [ca0, ca1] x [cb0, cb1].
export function yard(frame, roads, a0, a1, b0, b1, ca0, ca1, cb0, cb1, blds = []) {
  const toLocal = (x, z) => {
    const dx = x - frame.c[0], dz = z - frame.c[1];
    return [dx * frame.f[0] + dz * frame.f[1], dx * frame.p[0] + dz * frame.p[1]];
  };
  for (const [ax, az, bx, bz, width, roadClass] of roads) {
    if (roadClass > STREET_MAX_CLASS) continue;
    const segLen = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(segLen / 2));
    for (let k = 0; k <= steps; k++) {
      const [localA, localB] = toLocal(ax + ((bx - ax) * k) / steps, az + ((bz - az) * k) / steps);
      const halfW = width / 2 + YARD_STREET_PAD;
      if (localA < a0 - halfW || localA > a1 + halfW || localB < b0 - halfW || localB > b1 + halfW) continue;
      const moves = [];
      if (localA - halfW >= ca1) moves.push([a1 - (localA - halfW), () => (a1 = localA - halfW)]);
      if (localA + halfW <= ca0) moves.push([localA + halfW - a0, () => (a0 = localA + halfW)]);
      if (localB - halfW >= cb1) moves.push([b1 - (localB - halfW), () => (b1 = localB - halfW)]);
      if (localB + halfW <= cb0) moves.push([localB + halfW - b0, () => (b0 = localB + halfW)]);
      if (!moves.length) continue;
      moves.sort((moveA, moveB) => moveA[0] - moveB[0])[0][1]();
    }
  }
  for (let pass = 0; pass < YARD_RELAX_PASSES; pass++) {
    let moved = false;
    for (const ring of blds) {
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, insideCount = 0;
      for (const [x, z] of ring) {
        const [localA, localB] = toLocal(x, z);
        u0 = Math.min(u0, localA); u1 = Math.max(u1, localA);
        v0 = Math.min(v0, localB); v1 = Math.max(v1, localB);
        if (localA > a0 && localA < a1 && localB > b0 && localB < b1) insideCount++;
      }
      if (u1 <= a0 || u0 >= a1 || v1 <= b0 || v0 >= b1) continue;
      if (insideCount === ring.length && u0 > a0 + YARD_BLD_PAD && u1 < a1 - YARD_BLD_PAD && v0 > b0 + YARD_BLD_PAD && v1 < b1 - YARD_BLD_PAD) continue;
      const moves = [];
      if (u0 - YARD_BLD_PAD >= ca1) moves.push([a1 - (u0 - YARD_BLD_PAD), () => (a1 = u0 - YARD_BLD_PAD)]);
      if (u1 + YARD_BLD_PAD <= ca0) moves.push([u1 + YARD_BLD_PAD - a0, () => (a0 = u1 + YARD_BLD_PAD)]);
      if (v0 - YARD_BLD_PAD >= cb1) moves.push([b1 - (v0 - YARD_BLD_PAD), () => (b1 = v0 - YARD_BLD_PAD)]);
      if (v1 + YARD_BLD_PAD <= cb0) moves.push([v1 + YARD_BLD_PAD - b0, () => (b0 = v1 + YARD_BLD_PAD)]);
      if (!moves.length) continue;
      moves.sort((moveA, moveB) => moveA[0] - moveB[0])[0][1]();
      moved = true;
    }
    if (!moved) break;
  }
  return { a0, a1, b0, b1, ring: [frame.at(a0, b0), frame.at(a1, b0), frame.at(a1, b1), frame.at(a0, b1)] };
}

// A pair of gate leaves in an opening (wrought iron, closed), between two piers
export function leaves(S, pierA, pierB, y, height, col) {
  const ang = Math.atan2(pierB[1] - pierA[1], pierB[0] - pierA[0]);
  const len = Math.hypot(pierB[0] - pierA[0], pierB[1] - pierA[1]);
  const keepKind = S.kind;
  S.kind = KIND.PLAIN;
  for (const frac of [0.25, 0.75]) {
    const x = pierA[0] + (pierB[0] - pierA[0]) * frac;
    const z = pierA[1] + (pierB[1] - pierA[1]) * frac;
    S.box(x, z, y, y + height, len / 2 - 0.1, 0.06, ang, col);
  }
  S.kind = keepKind;
}

export const lightBuf = () => new Buf(256);
