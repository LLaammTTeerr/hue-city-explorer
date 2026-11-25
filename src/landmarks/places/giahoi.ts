import { KIND, hex, shade, inRing, unflat, pathLength } from '../../geo/buf.ts';
import { PAL, LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints } from '../../geo/materials.ts';
import { bridgeProfiles, onLand, ABUT } from '../../geo/bridges.ts';

// ---- Cầu Gia Hội: the road bridge over sông Đông Ba between Trần Hưng Đạo and Chi Lăng ----
export const id = 'giahoi';
const BRIDGE_NAME = 'Cầu Gia Hội';
const HALF_WIDTH = 10.5;
const DECK_SEGMENTS = 48;
const SPAN_COUNT = 3;
const WATER_Y = 0;
const RAIL_CELL = 0.25;
const RAIL_BAY = 3.0;
const WING_LEN = 13;
const QUAY_LEN = 45;

const COLORS = {
  asphalt: hex(PAL.road[2]),
  walk: hex('#c9c5bb'),
  kerb: hex('#b9b5ab'),
  concrete: hex('#a3a49c'),
  soffit: shade(hex('#9a998f'), 0.55),
  pier: hex('#a7a69d'),
  rail: hex('#dcddd8'),
  railDark: shade(hex('#dcddd8'), 0.86),
  stone: hex('#9d9586'),
  paint: hex('#f1ece0'),
  pipe: hex('#8f918b'),
  tile: hex('#a8604c'),
  globe: hex('#f2f0e8'),
  bronze: hex('#5e4636'),
  pole: hex('#9ea2a3'),
  separator: hex('#c7c5bd'),
};

const ownedRoadsCache = new WeakMap();
export function ownRoads(data) {
  if (ownedRoadsCache.has(data)) return ownedRoadsCache.get(data);
  const out = new Set();
  ownedRoadsCache.set(data, out);
  const bridge = (data.bridges || []).find((entry) => entry.n === BRIDGE_NAME);
  if (!bridge) return out;
  const ring = unflat(bridge.ring);
  for (const road of data.roads || []) {
    if (!Array.isArray(road) || !road[1] || !Array.isArray(road[2]) || road[2].length < 4) continue;
    const pts = unflat(road[2]), first = pts[0], last = pts[pts.length - 1];
    if (inRing((first[0] + last[0]) / 2, (first[1] + last[1]) / 2, ring)) out.add(road[2]);
  }
  return out;
}

const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));

function drawPilaster(S, [x, y, z], width, ang) {
  S.box(x, z, y, y + 1.0, width, width, ang, COLORS.rail);
  S.box(x, z, y + 1.0, y + 1.08, width + 0.1, width + 0.1, ang, COLORS.railDark);
  S.box(x, z, y + 1.08, y + 1.2, width + 0.04, width + 0.04, ang, COLORS.rail, { taper: 0.55 });
}

function drawBalustradeBay(S, ptA, ptB) {
  const ex = ptB[0] - ptA[0], ez = ptB[2] - ptA[2];
  const len = Math.hypot(ex, ez);
  const dir = [ex / len, ez / len], slope = (ptB[1] - ptA[1]) / len;
  const normFront = [-dir[1], 0, dir[0]], normBack = [dir[1], 0, -dir[0]];
  const bayPt = (along, height): [number, number, number] => [ptA[0] + dir[0] * along, ptA[1] + slope * along + height, ptA[2] + dir[1] * along];

  const drawRibbon = (pts2, width) => {
    for (let i = 0; i + 1 < pts2.length; i++) {
      const [sa, ha] = pts2[i], [sb, hb] = pts2[i + 1];
      const segLen = Math.hypot(sb - sa, hb - ha) || 1;
      const offS = (-(hb - ha) / segLen) * (width / 2);
      const offH = ((sb - sa) / segLen) * (width / 2);
      const quad = [bayPt(sa - offS, ha - offH), bayPt(sb - offS, hb - offH), bayPt(sb + offS, hb + offH), bayPt(sa + offS, ha + offH)];
      S.quad(...quad, COLORS.rail, normFront);
      S.quad(...quad, COLORS.rail, normBack);
    }
  };
  const ringPts = (sc, hc, rad) => [...Array(7)].map((_, i) => {
    const theta = (i / 6) * Math.PI * 2 + Math.PI / 2;
    return [sc + Math.cos(theta) * rad * 0.8, hc + Math.sin(theta) * rad];
  });

  const startPt = bayPt(0, 0), endPt = bayPt(len, 0);
  S.beam([startPt[0], startPt[1] + 0.9, startPt[2]], [endPt[0], endPt[1] + 0.9, endPt[2]], 0.24, 0.12, COLORS.rail);
  S.beam([startPt[0], startPt[1] + 0.08, startPt[2]], [endPt[0], endPt[1] + 0.08, endPt[2]], 0.12, 0.08, COLORS.railDark);

  const p0 = 0.2, p1 = len - 0.2;
  const cellCount = Math.max(1, Math.round((p1 - p0) / RAIL_CELL));
  const cellW = (p1 - p0) / cellCount;
  for (let k = 0; k <= cellCount; k++) {
    const along = p0 + cellW * k;
    if (k % 2 === 0) drawRibbon([[along, 0.12], [along, 0.85]], 0.03);
    if (k === cellCount) break;
    for (const hc of [0.27, 0.48, 0.69]) drawRibbon(ringPts(along + cellW / 2, hc, cellW * 0.42), 0.022);
    drawRibbon([[along, 0.38], [along + cellW, 0.58]], 0.018);
  }
}

function buildDeckSurfaceAndGirders(S, frame) {
  const { vMid, vMin, vMax, norm, bankE, spanLen, endAt, xz, yAt, uOf, pt3 } = frame;

  const drawBand = (va, vb, dy, col, kerbs: boolean | 'only' = false) => {
    if (va < vMid - 1e-6 && vb > vMid + 1e-6) {
      drawBand(va, vMid, dy, col);
      drawBand(vMid, vb, dy, col);
      if (!kerbs || dy <= 0) return;
      kerbs = 'only';
    }
    for (let i = 0; i < DECK_SEGMENTS; i++) {
      const f0 = i / DECK_SEGMENTS, f1 = (i + 1) / DECK_SEGMENTS;
      if (kerbs === 'only') {
        if (dy <= 0) break;
        const nv = [norm[0], 0, norm[1]];
        S.quad(pt3(f0, va, 0), pt3(f1, va, 0), pt3(f1, va, dy), pt3(f0, va, dy), COLORS.kerb, [-nv[0], 0, -nv[2]]);
        S.quad(pt3(f0, vb, 0), pt3(f1, vb, 0), pt3(f1, vb, dy), pt3(f0, vb, dy), COLORS.kerb, nv);
        continue;
      }
      S.quad(pt3(f0, va, dy), pt3(f0, vb, dy), pt3(f1, vb, dy), pt3(f1, va, dy), col, [0, 1, 0]);
      if (kerbs && dy > 0) {
        const nv = [norm[0], 0, norm[1]];
        S.quad(pt3(f0, va, 0), pt3(f1, va, 0), pt3(f1, va, dy), pt3(f0, va, dy), COLORS.kerb, [-nv[0], 0, -nv[2]]);
        S.quad(pt3(f0, vb, 0), pt3(f1, vb, 0), pt3(f1, vb, dy), pt3(f0, vb, dy), COLORS.kerb, nv);
      }
    }
  };

  drawBand(vMin + 0.3, vMin + 2.1, 0.18, COLORS.walk, true);
  drawBand(vMin + 2.1, vMid - 1.0, 0, COLORS.asphalt);
  drawBand(vMid - 1.0, vMid + 1.0, 0.18, COLORS.walk, true);
  drawBand(vMid + 1.0, vMax - 2.1, 0, COLORS.asphalt);
  drawBand(vMax - 2.1, vMax - 0.3, 0.18, COLORS.walk, true);

  for (const v of [vMin + 2.35, vMid - 1.25, vMid + 1.25, vMax - 2.35]) {
    for (let i = 1; i < DECK_SEGMENTS - 1; i += 2) {
      S.quad(pt3(i / DECK_SEGMENTS, v - 0.07, 0.02), pt3(i / DECK_SEGMENTS, v + 0.07, 0.02), pt3((i + 1) / DECK_SEGMENTS, v + 0.07, 0.02), pt3((i + 1) / DECK_SEGMENTS, v - 0.07, 0.02), COLORS.paint, [0, 1, 0]);
    }
  }

  for (const [v, sgn] of ([[vMin, -1], [vMax, 1]] as any[])) {
    const nv = [norm[0] * sgn, 0, norm[1] * sgn];
    for (let i = 0; i < DECK_SEGMENTS; i++) {
      const f0 = i / DECK_SEGMENTS, f1 = (i + 1) / DECK_SEGMENTS;
      const u0 = uOf(f0, v), u1 = uOf(f1, v);
      const [x0, z0] = xz(u0, v), [x1, z1] = xz(u1, v);
      const y0 = yAt(u0, v), y1 = yAt(u1, v);
      S.quad([x0, y0 - 1.0, z0], [x1, y1 - 1.0, z1], [x1, y1 + 0.3, z1], [x0, y0 + 0.3, z0], COLORS.concrete, nv);
      S.quad([x0, y0 - 1.0, z0], [x1, y1 - 1.0, z1], [x1, y1 - 0.72, z1], [x0, y0 - 0.72, z0], shade(COLORS.concrete, 0.82), nv);
    }
  }
  for (const [va, vb] of ([[vMin, vMin + 0.3], [vMax - 0.3, vMax]] as any[])) drawBand(va, vb, 0.3, COLORS.railDark, false);
  for (const [v, sgn] of ([[vMin + 0.3, 1], [vMax - 0.3, -1]] as any[])) {
    for (let i = 0; i < DECK_SEGMENTS; i++) {
      const f0 = i / DECK_SEGMENTS, f1 = (i + 1) / DECK_SEGMENTS;
      S.quad(pt3(f0, v, 0.18), pt3(f1, v, 0.18), pt3(f1, v, 0.3), pt3(f0, v, 0.3), COLORS.railDark, [norm[0] * sgn, 0, norm[1] * sgn]);
    }
  }

  for (const [va, vb] of ([[vMin, vMid], [vMid, vMax]] as any[])) {
    for (let i = 0; i < DECK_SEGMENTS; i++) {
      const f0 = i / DECK_SEGMENTS, f1 = (i + 1) / DECK_SEGMENTS;
      S.quad(pt3(f0, va, -0.72), pt3(f0, vb, -0.72), pt3(f1, vb, -0.72), pt3(f1, va, -0.72), COLORS.soffit, [0, -1, 0]);
    }
  }
  const girderStep = 1.5;
  for (let k = 0; k < SPAN_COUNT; k++) {
    const ua = bankE + spanLen * k + 0.7, ub = bankE + spanLen * (k + 1) - 0.7;
    for (const offset of [-7.5, -2.5, 2.5, 7.5]) {
      const v = vMid + offset;
      for (let u = ua; u < ub - 1e-6; u += girderStep) {
        const u2 = Math.min(ub, u + girderStep);
        const [x0, z0] = xz(u, v), [x1, z1] = xz(u2, v);
        S.beam([x0, yAt(u, v) - 0.86, z0], [x1, yAt(u2, v) - 0.86, z1], 0.28, 0.5, COLORS.soffit);
      }
    }
  }
}

function buildPiersPipeAndAbutments(S, frame) {
  const { vMid, vMin, vMax, norm, bankE, bankW, piers, ang, endAt, xz, yAt } = frame;

  for (const u of piers) {
    const [x, z] = xz(u, vMid);
    const capBottomY = Math.min(yAt(u, vMin), yAt(u, vMax)) - 1.42;
    S.box(x, z, capBottomY, capBottomY + 0.42, HALF_WIDTH * 2 - 0.6, 1.1, ang, COLORS.pier, { bottom: true });
    for (const offset of [-7.8, -2.6, 2.6, 7.8]) {
      const [cx, cz] = xz(u, vMid + offset);
      S.box(cx, cz, WATER_Y - 2.5, capBottomY, 0.7, 0.7, ang, COLORS.pier);
      S.box(cx, cz, WATER_Y - 0.1, WATER_Y + 0.35, 0.76, 0.76, ang, shade(COLORS.pier, 0.72));
    }
  }

  // Water main under NW footway
  const pipeV = vMax - 1.6, pipeRad = 0.32, pipeSides = 8, uStart = bankE - 1.0, uEnd = bankW + 1.0, pipeSegs = 32;
  const pipeRing = (u) => {
    const [x, z] = xz(u, pipeV), yc = yAt(u, pipeV) - 0.72 - pipeRad - 0.04;
    return [...Array(pipeSides)].map((_, i) => {
      const theta = (i / pipeSides) * Math.PI * 2;
      return [x + norm[0] * Math.cos(theta) * pipeRad, yc + Math.sin(theta) * pipeRad, z + norm[1] * Math.cos(theta) * pipeRad];
    });
  };
  let prevRing = pipeRing(uStart);
  for (let i = 1; i <= pipeSegs; i++) {
    const curRing = pipeRing(uStart + ((uEnd - uStart) * i) / pipeSegs);
    for (let k = 0; k < pipeSides; k++) {
      const kNext = (k + 1) % pipeSides, midAng = ((k + 0.5) / pipeSides) * Math.PI * 2;
      S.quad(prevRing[k], prevRing[kNext], curRing[kNext], curRing[k], COLORS.pipe, [norm[0] * Math.cos(midAng), Math.sin(midAng), norm[1] * Math.cos(midAng)]);
    }
    prevRing = curRing;
  }

  // Abutments and segmental arch on market-side abutment
  for (const [va, vb] of [[vMin - 0.3, vMid], [vMid, vMax + 0.3]]) {
    for (const [endIdx, inward] of [[0, 1], [1, -1]]) {
      const vc = (va + vb) / 2, u0 = endAt(vc, endIdx), [x, z] = xz(u0, vc);
      const topY = Math.min(yAt(u0 + inward * ABUT, va), yAt(u0 + inward * ABUT, vb)) - 0.72;
      S.box(x, z, WATER_Y - 2.5, topY, vb - va, ABUT * 2, ang, COLORS.stone, { top: COLORS.concrete });
      if (endIdx === 1) {
        for (const [vf, sgn] of ([[vMin - 0.3, -1], [vMax + 0.3, 1]] as any[])) {
          if (Math.abs(vf - vc) > (vb - va) / 2 + 0.01) continue;
          const vo = vf + sgn * 0.03, nv = [norm[0] * sgn, 0, norm[1] * sgn];
          const archHalf = 1.45, baseY = WATER_Y + 0.35;
          const crownY = Math.min(WATER_Y + 1.75, yAt(u0, vf) - 1.05), springY = crownY - 0.45, archSegs = 10;
          const archPt = (du, y) => { const [px, pz] = xz(u0 + du, vo); return [px, y, pz]; };
          const arcY = (du) => springY + (crownY - springY) * Math.sqrt(Math.max(0, 1 - (du / archHalf) ** 2));
          for (let i = 0; i < archSegs; i++) {
            const d0 = -archHalf + (2 * archHalf * i) / archSegs;
            const d1 = -archHalf + (2 * archHalf * (i + 1)) / archSegs;
            S.quad(archPt(d0, baseY), archPt(d1, baseY), archPt(d1, arcY(d1)), archPt(d0, arcY(d0)), hex('#26282a'), nv);
          }
        }
      }
    }
  }
}

function buildBalustradeAndQuay(data, S, frame) {
  const { vMin, vMax, tangent, ang, endAt, xz, yAt } = frame;

  for (const v of [vMin + 0.15, vMax - 0.15]) {
    const u0 = endAt(v, 0) + 0.3, u1 = endAt(v, 1) - 0.3;
    const bayCount = Math.max(2, Math.round((u1 - u0) / RAIL_BAY));
    const railPt = (u): [number, number, number] => { const [x, z] = xz(u, v); return [x, yAt(u, v) + 0.3, z]; };
    for (let i = 0; i <= bayCount; i++) drawPilaster(S, railPt(u0 + ((u1 - u0) * i) / bayCount), i === 0 || i === bayCount ? 0.48 : 0.32, ang);
    for (let i = 0; i < bayCount; i++) drawBalustradeBay(S, railPt(u0 + ((u1 - u0) * i) / bayCount), railPt(u0 + ((u1 - u0) * (i + 1)) / bayCount));
  }

  // Wing parapet turning onto Bạch Đằng quay
  const isLandAt = (x, z) => rise(x, z) > 0.05 || onLand(data, x, z);
  const wingPts = [];
  const wingV = vMax - 0.15, startU = endAt(wingV, 0) + 0.3;
  let [x, z] = xz(startU, wingV);
  let dir = [-tangent[0], -tangent[1]];
  const bearing0 = Math.atan2(dir[0], -dir[1]), bearing1 = bearing0 - (52 * Math.PI) / 180;
  for (let dist = 0; dist <= QUAY_LEN + 0.01; dist += 0.5) {
    if (dist > 0) {
      const bearing = bearing0 + (bearing1 - bearing0) * Math.min(1, dist / 7.5);
      dir = [Math.sin(bearing), -Math.cos(bearing)];
      x += dir[0] * 0.5;
      z += dir[1] * 0.5;
      const leftDir = [dir[1], -dir[0]];
      let bestOffset = null;
      for (let off = -2.5; off <= 2.5; off += 0.25) {
        if (isLandAt(x + leftDir[0] * off, z + leftDir[1] * off) && !isLandAt(x + leftDir[0] * (off + 0.25), z + leftDir[1] * (off + 0.25))) {
          if (bestOffset === null || Math.abs(off) < Math.abs(bestOffset)) bestOffset = off;
        }
      }
      if (bestOffset !== null) {
        x += leftDir[0] * (bestOffset - 0.2);
        z += leftDir[1] * (bestOffset - 0.2);
      }
    }
    wingPts.push([x, z]);
  }

  const deckEndY = yAt(startU, wingV);
  const quayGroundY = (qx, qz) => LAND_Y + rise(qx, qz) + 0.06;
  const wingEndIdx = WING_LEN / 0.5;
  const wingSamples = [];
  for (let i = 0; i < wingEndIdx; i += 5) wingSamples.push(wingPts[i]);
  wingSamples.push(wingPts[wingEndIdx]);
  const wing3 = wingSamples.map(([wx, wz], i) => [wx, Math.max(i ? quayGroundY(wx, wz) : deckEndY, quayGroundY(wx, wz)) + 0.3, wz]);
  for (let i = 0; i + 1 < wing3.length; i++) {
    const ptA = wing3[i], ptB = wing3[i + 1];
    S.beam([ptA[0], ptA[1] - 0.15, ptA[2]], [ptB[0], ptB[1] - 0.15, ptB[2]], 0.34, 0.3, COLORS.railDark);
    drawBalustradeBay(S, ptA, ptB);
  }
  for (let i = 1; i < wing3.length; i++) {
    const ptA = wing3[i - 1], ptB = wing3[i];
    drawPilaster(S, ptB as [number, number, number], i === wing3.length - 1 ? 0.48 : 0.32, Math.atan2(ptB[2] - ptA[2], ptB[0] - ptA[0]));
  }

  const quaySamples = [];
  for (let i = wingEndIdx; i < wingPts.length; i += 5) quaySamples.push(wingPts[i]);
  if ((wingPts.length - 1 - wingEndIdx) % 5) quaySamples.push(wingPts[wingPts.length - 1]);
  const quay3 = quaySamples.map(([qx, qz]) => [qx, quayGroundY(qx, qz) + 0.3, qz]);
  const drawBaluster = (bx, by, bz) => {
    S.cyl(bx, bz, by, by + 0.08, 0.07, 0.07, 6, COLORS.rail, { cap: false });
    S.cyl(bx, bz, by + 0.08, by + 0.32, 0.05, 0.085, 6, COLORS.rail, { cap: false });
    S.cyl(bx, bz, by + 0.32, by + 0.5, 0.085, 0.04, 6, COLORS.rail, { cap: false });
    S.cyl(bx, bz, by + 0.5, by + 0.62, 0.04, 0.06, 6, COLORS.rail, { cap: false });
    S.cyl(bx, bz, by + 0.62, by + 0.7, 0.06, 0.06, 6, COLORS.rail);
  };
  for (let i = 0; i + 1 < quay3.length; i++) {
    const ptA = quay3[i], ptB = quay3[i + 1], segLen = Math.hypot(ptB[0] - ptA[0], ptB[2] - ptA[2]);
    S.beam([ptA[0], ptA[1] - 0.15, ptA[2]], [ptB[0], ptB[1] - 0.15, ptB[2]], 0.34, 0.3, COLORS.railDark);
    S.beam([ptA[0], ptA[1] + 0.76, ptA[2]], [ptB[0], ptB[1] + 0.76, ptB[2]], 0.2, 0.12, COLORS.rail);
    const balCount = Math.max(1, Math.round(segLen / 0.3));
    for (let k = 1; k < balCount; k++) {
      const frac = k / balCount;
      drawBaluster(ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac, ptA[2] + (ptB[2] - ptA[2]) * frac);
    }
    const segAng = Math.atan2(ptB[2] - ptA[2], ptB[0] - ptA[0]);
    S.box(ptB[0], ptB[2], ptB[1], ptB[1] + 0.86, 0.3, 0.3, segAng, COLORS.rail);
    S.box(ptB[0], ptB[2], ptB[1] + 0.86, ptB[1] + 0.94, 0.38, 0.38, segAng, COLORS.railDark);
  }

  const walkSamples = [...wingSamples.slice(1), ...quaySamples.slice(1)];
  for (let i = 0; i + 1 < walkSamples.length; i++) {
    const [ax, az] = walkSamples[i], [bx, bz] = walkSamples[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az) || 1;
    const rx = -(bz - az) / segLen, rz = (bx - ax) / segLen;
    const walkPt = (px, pz, off) => { const wx = px + rx * off, wz = pz + rz * off; return [wx, quayGroundY(wx, wz) + 0.1, wz]; };
    S.quad(walkPt(ax, az, 0.2), walkPt(ax, az, 2.8), walkPt(bx, bz, 2.8), walkPt(bx, bz, 0.2), COLORS.tile, [0, 1, 0]);
  }
  return wingPts;
}

function buildLampsAndSeparators(S, group, frame, wingPts) {
  const { vMid, vMin, vMax, tangent, norm, ang, endAt, xz, yAt, uOf } = frame;

  const drawGlobe = (x, y, z, rad) => {
    S.cyl(x, z, y - rad, y, rad * 0.55, rad, 8, COLORS.globe, { cap: false });
    S.cyl(x, z, y, y + rad, rad, rad * 0.25, 8, COLORS.globe);
  };
  const lampCoords = [[vMin + 0.75, 0], [vMin + 0.75, 1], [vMax - 0.75, 1]].map(([v, endIdx]) => {
    const u = endAt(v, endIdx) + (endIdx ? -0.9 : 0.9);
    return [...xz(u, v), yAt(u, v) + 0.18];
  });
  const wingIdx = Math.min(15, wingPts.length - 2);
  const [ax, az] = wingPts[wingIdx - 1], [bx, bz] = wingPts[wingIdx + 1], segLen = Math.hypot(bx - ax, bz - az);
  const cornerX = wingPts[wingIdx][0] - ((bz - az) / segLen) * 0.7;
  const cornerZ = wingPts[wingIdx][1] + ((bx - ax) / segLen) * 0.7;
  lampCoords.push([cornerX, cornerZ, LAND_Y + rise(cornerX, cornerZ) + 0.06]);

  const glowPos = [], glowCol = [];
  for (const [x, z, y] of lampCoords) {
    S.box(x, z, y, y + 0.9, 0.42, 0.42, ang, COLORS.bronze, { taper: 0.7 });
    glowPos.push(x, y + 4.6, z);
    glowCol.push(1.0, 0.86, 0.66);
    S.cyl(x, z, y + 0.9, y + 4.1, 0.1, 0.07, 8, COLORS.bronze);
    S.box(x, z, y + 4.05, y + 4.12, 1.15, 0.07, ang, COLORS.bronze);
    S.box(x, z, y + 4.05, y + 4.12, 0.07, 1.15, ang, COLORS.bronze);
    for (const [du, dv] of ([[0.55, 0], [-0.55, 0], [0, 0.55], [0, -0.55]] as any[])) {
      drawGlobe(x + tangent[0] * du + norm[0] * dv, y + 4.42, z + tangent[1] * du + norm[1] * dv, 0.2);
    }
    S.cyl(x, z, y + 4.1, y + 4.55, 0.06, 0.06, 6, COLORS.bronze);
    drawGlobe(x, y + 4.82, z, 0.22);
  }

  for (const frac of [0.18, 0.5, 0.82]) {
    const u = uOf(frac, vMid), [x, z] = xz(u, vMid), y = yAt(u, vMid) + 0.18;
    S.cyl(x, z, y, y + 9.0, 0.13, 0.07, 8, COLORS.pole);
    for (const side of [-1, 1]) {
      const [armX, armZ] = xz(u, vMid + side * 1.6), [headX, headZ] = xz(u, vMid + side * 2.3);
      S.beam([x, y + 8.4, z], [armX, y + 9.1, armZ], 0.07, 0.07, COLORS.pole);
      S.beam([armX, y + 9.1, armZ], [headX, y + 9.15, headZ], 0.07, 0.07, COLORS.pole);
      S.box(headX, headZ, y + 8.98, y + 9.13, 0.75, 0.3, ang, COLORS.pole);
      glowPos.push(headX, y + 8.9, headZ);
      glowCol.push(1.0, 0.8, 0.55);
    }
  }
  if (group && glowPos.length) {
    const pts = glowPoints(glowPos, glowCol, 7);
    pts.material.uniforms.uBoost.value = 0.6;
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }

  const sepV = vMax - 2.1 - 1.9;
  for (let u = uOf(0.04, sepV) + 0.6; u < uOf(0.96, sepV) - 0.6; u += 2.4) {
    const [x, z] = xz(u, sepV), y = yAt(u, sepV);
    S.box(x, z, y, y + 0.5, 0.45, 1.2, ang, COLORS.separator, { taper: 0.6 });
  }
}

export function build({ data, S, group }) {
  const flatRoads = [...ownRoads(data)];
  if (flatRoads.length < 1) throw new Error('Gia Hội carriageways not found');
  const profiles = bridgeProfiles(data);
  const roads: Record<string, any>[] = flatRoads
    .map((flat) => { const pts = unflat(flat); return { pts, len: pathLength(pts), profile: profiles.get(flat) }; })
    .filter((entry) => entry.profile);
  if (!roads.length) throw new Error('Gia Hội deck profile missing');

  const ends = roads.map((road) => [road.pts[0], road.pts[road.pts.length - 1]]);
  const refDir = [ends[0][1][0] - ends[0][0][0], ends[0][1][1] - ends[0][0][1]];
  const eastPts = [], westPts = [];
  for (const [ptA, ptB] of ends) {
    const forward = (ptB[0] - ptA[0]) * refDir[0] + (ptB[1] - ptA[1]) * refDir[1] > 0;
    const [first, second] = forward ? [ptA, ptB] : [ptB, ptA];
    eastPts.push(first);
    westPts.push(second);
  }
  const avgPt = (pts): [number, number] => [pts.reduce((sum, pt) => sum + pt[0], 0) / pts.length, pts.reduce((sum, pt) => sum + pt[1], 0) / pts.length];
  let originEast = avgPt(eastPts), originWest = avgPt(westPts);
  if (originEast[0] < originWest[0]) [originEast, originWest] = [originWest, originEast];
  const axisLen = Math.hypot(originWest[0] - originEast[0], originWest[1] - originEast[1]);
  const tangent = [(originWest[0] - originEast[0]) / axisLen, (originWest[1] - originEast[1]) / axisLen];
  const norm = [-tangent[1], tangent[0]];
  const toUV = (x, z): [number, number] => [(x - originEast[0]) * tangent[0] + (z - originEast[1]) * tangent[1], (x - originEast[0]) * norm[0] + (z - originEast[1]) * norm[1]];
  const xz = (u, v): [number, number] => [originEast[0] + tangent[0] * u + norm[0] * v, originEast[1] + tangent[1] * u + norm[1] * v];

  for (const road of roads) {
    const uvA = toUV(road.pts[0][0], road.pts[0][1]), uvB = toUV(road.pts[road.pts.length - 1][0], road.pts[road.pts.length - 1][1]);
    road.v = (uvA[1] + uvB[1]) / 2;
    road.ua = Math.min(uvA[0], uvB[0]);
    road.ub = Math.max(uvA[0], uvB[0]);
    road.rev = uvA[0] > uvB[0];
    const span = road.profile.span || [0, road.len];
    const uOfS = (dist) => (road.rev ? road.ub - dist : road.ua + dist);
    road.ea = Math.min(uOfS(span[0]), uOfS(span[1]));
    road.eb = Math.max(uOfS(span[0]), uOfS(span[1]));
  }
  roads.sort((a, b) => a.v - b.v);
  const loRoad = roads[0], hiRoad = roads[roads.length - 1];
  const yRoad = (road, u) => road.profile.y(clamp(road.rev ? road.ub - u : u - road.ua, 0, road.len));
  const yAt = (u, v) => {
    if (loRoad === hiRoad) return yRoad(loRoad, u);
    const weight = clamp((v - loRoad.v) / (hiRoad.v - loRoad.v), 0, 1);
    return yRoad(loRoad, u) * (1 - weight) + yRoad(hiRoad, u) * weight;
  };
  const vMid = (loRoad.v + hiRoad.v) / 2;
  const endAt = (v, endIdx) => { const road = v < vMid ? loRoad : hiRoad; return endIdx ? road.eb : road.ea; };
  const vMin = vMid - HALF_WIDTH, vMax = vMid + HALF_WIDTH;

  const isLand = (u, v) => { const [x, z] = xz(u, v); return rise(x, z) > 0.05 || onLand(data, x, z); };
  let bankE = 0.5, bankW = 46;
  const uStart = Math.max(loRoad.ea, hiRoad.ea), uEnd = Math.min(loRoad.eb, hiRoad.eb);
  let firstWater = null, lastWater = null;
  for (let u = uStart; u <= uEnd; u += 0.5) {
    if (!isLand(u, vMid)) {
      if (firstWater === null) firstWater = u;
      lastWater = u;
    }
  }
  if (firstWater !== null && lastWater - firstWater > 10) {
    bankE = Math.max(firstWater, uStart + 1.2);
    bankW = lastWater;
  }

  const spanLen = (bankW - bankE) / SPAN_COUNT;
  const piers = [];
  for (let k = 1; k < SPAN_COUNT; k++) piers.push(bankE + spanLen * k);

  S.kind = KIND.PLAIN;
  S.base = 0;
  const uOf = (frac, v) => endAt(v, 0) + (endAt(v, 1) - endAt(v, 0)) * frac;
  const pt3 = (frac, v, dy = 0) => { const u = uOf(frac, v); const [x, z] = xz(u, v); return [x, yAt(u, v) + dy, z]; };
  const ang = Math.atan2(norm[1], norm[0]);

  const frame = { vMid, vMin, vMax, tangent, norm, bankE, bankW, spanLen, piers, ang, endAt, xz, yAt, uOf, pt3 };
  buildDeckSurfaceAndGirders(S, frame);
  buildPiersPipeAndAbutments(S, frame);
  const wingPts = buildBalustradeAndQuay(data, S, frame);
  buildLampsAndSeparators(S, group, frame, wingPts);
  S.kind = KIND.PLAIN;
}
