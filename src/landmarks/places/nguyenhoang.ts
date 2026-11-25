import * as THREE from 'three';
import { KIND, hex, shade, mix, Buf } from '../../geo/buf.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { rise } from '../../geo/terrain.ts';
import { LAND_Y, PAL, roadWidth } from '../../config.ts';

// Cầu Nguyễn Hoàng (cầu vượt sông Hương), opened to traffic 26 March 2025, named 8 September 2025.
// Design I156 (WSP Finland + E&R): two yellow arches like a crane's spread wings ("hạc chầu Thiên Mụ").
// See docs/places/nguyenhoang.md for sources, satellite measurements, and estimates.
export const id = 'nguyenhoang';

const BRIDGE_LEN = 350;
const HALF_WIDTH = 21.5;
const V_MED = 1.0, V_CAR = 11.5, V_RIB = 13, V_STRIP = 14.5, V_MOTO = 18, V_RAIL = 21.35;
const Y_END = 6.6, Y_MID = 8.4;
const ARCH_FOOT = 87, Y_SPRING = 1.2, Y_CROWN = 30.6;
const WING_S = [118, 128], WING_L = [42, 44], WING_W = 4.4, PLAZA_R = 12.5;
const PEEL_LEN = 30, WING_GATE = 2;
const V_PIER_TOP = 114, SIDE_PIER_S = 144, RAMP_LEN = 46, TRANS_LEN = 24;
const JOIN_REACH = 6;
const ARCH_SEGS = 40;

const COLORS = {
  asphalt: hex('#6f6c69'),
  moto: hex('#7b706a'),
  granite: hex('#a8746a'),
  strip: hex('#cfcbc2'),
  fascia: hex('#dcd9d2'),
  under: hex('#9d9a94'),
  steel: hex('#b9b6ae'),
  concrete: hex('#bdb7ab'),
  wet: hex('#77756f'),
  gold: hex('#f2c21b'),
  goldDark: hex('#d29f12'),
  rail: hex('#f1efe9'),
  line: hex('#ecebe4'),
  lampGold: hex('#e0b23a'),
  roadStreet: hex(PAL.road[1]),
  paveStreet: hex(PAL.casing),
};

function computeFrame(data) {
  const nh = data.nguyenhoang;
  if (!nh) throw new Error('no nguyenhoang outline in hue.json');
  const ang = nh.a / 1000;
  const dirU = [Math.cos(ang), Math.sin(ang)], dirV = [-dirU[1], dirU[0]];
  const center = [nh.c[0] / 10, nh.c[1] / 10];
  const halfLen = BRIDGE_LEN / 2;
  const heads = [];
  for (const road of data.roads || []) {
    const [cls, isBridge, flat] = road;
    if (isBridge || cls > 3) continue;
    for (const k of [0, flat.length - 2]) {
      const dx = flat[k] / 10 - center[0], dz = flat[k + 1] / 10 - center[1];
      heads.push({ s: dx * dirU[0] + dz * dirU[1], t: dx * dirV[0] + dz * dirV[1], hw: roadWidth(road) / 2 });
    }
  }
  const ends = [-1, 1].map((endSign) => {
    let best = halfLen + RAMP_LEN;
    for (const head of heads) if (Math.abs(head.t) < HALF_WIDTH && head.s * endSign > halfLen && head.s * endSign < best) best = head.s * endSign;
    return best;
  });
  const approach = [-1, 1].map((endSign, i) =>
    heads
      .filter((head) => Math.abs(head.t) < HALF_WIDTH && head.s * endSign >= ends[i] - 0.05 && head.s * endSign < ends[i] + JOIN_REACH)
      .map((head) => [head.t, head.hw]),
  );
  return { center, ang, dirU, dirV, halfLen, ends, approach };
}

export function deckEnds(data) {
  const { center, dirU, ends } = computeFrame(data);
  return [-1, 1].map((endSign, i) => ({
    p: [center[0] + dirU[0] * endSign * ends[i], center[1] + dirU[1] * endSign * ends[i]],
    u: [dirU[0] * endSign, dirU[1] * endSign],
    hw: HALF_WIDTH,
    reach: JOIN_REACH,
  }));
}

function buildDeckAndGirders(S, ctx) {
  const { dirV, halfLen, ends, approach, abut, at, ground, endOf, top, isOpen } = ctx;
  const pavedStart = S.n;
  const stations = [];
  for (let s = -ends[0]; s < ends[1]; s += 5) stations.push(s);
  for (const endSign of [-1, 1]) {
    for (let dist = endOf(endSign) - TRANS_LEN; dist < endOf(endSign); dist += 1) stations.push(Math.round(endSign * dist * 100) / 100);
  }
  stations.push(ends[1]);
  for (const s of [-halfLen, halfLen, ...abut]) if (!stations.includes(s)) stations.push(s);
  stations.sort((a, b) => a - b);

  const streetLayout = approach.map((list) => [-1, 1].map((side) => {
    const own = list.filter(([t]) => t * side > 0).map(([t, hw]) => [Math.abs(t) - hw, Math.abs(t) + hw]).sort((p, q) => p[0] - q[0]);
    if (!own.length) return null;
    const [main, slip] = own;
    const med = Math.max(0.3, main[0]), car = Math.max(med + 2, main[1]);
    const st = slip ? Math.max(car, slip[0]) : Math.min(car + 3, HALF_WIDTH - 3);
    const mo = slip ? Math.max(st + 2, Math.min(HALF_WIDTH - 0.5, slip[1])) : HALF_WIDTH - 1.5;
    return [med, car, st, mo];
  }));

  const deckEdges = [V_MED, V_CAR, V_STRIP, V_MOTO];
  const nearEnd = (s) => {
    const endDist = endOf(s), frac = (Math.abs(s) - (endDist - TRANS_LEN)) / TRANS_LEN;
    return frac <= 0 ? 0 : frac >= 1 ? 1 : frac * frac * (3 - 2 * frac);
  };
  const edgesAt = (s, side) => {
    const target = streetLayout[s < 0 ? 0 : 1][(side + 1) / 2], blend = target ? nearEnd(s) : 0;
    return deckEdges.map((val, j) => val + ((target ? target[j] : val) - val) * blend);
  };
  const blendCol = (col, toCol, s) => mix(col, toCol, nearEnd(s));
  const tilt = (s, t) => {
    const blend = nearEnd(s);
    return blend ? blend * (ground(Math.sign(s) * endOf(s), t) - ground(Math.sign(s) * endOf(s))) : 0;
  };
  const atDeck = (s, t, y) => at(s, t, y + tilt(s, t));

  const bands: [number, number, number, any, any, number][] = [
    [0, 1, 0.0, COLORS.asphalt, COLORS.roadStreet, KIND.ROAD],
    [1, 2, 0.28, COLORS.strip, COLORS.paveStreet, KIND.PLAIN],
    [2, 3, 0.0, COLORS.moto, COLORS.roadStreet, KIND.ROAD],
    [3, -1, 0.2, COLORS.granite, COLORS.paveStreet, KIND.ROAD],
  ];

  for (let i = 0; i + 1 < stations.length; i++) {
    const sA = stations[i], sB = stations[i + 1], yA = top(sA), yB = top(sB), sMid = (sA + sB) / 2;
    const flatA = 1 - nearEnd(sA), flatB = 1 - nearEnd(sB);
    const isSpan = sA >= abut[0] - 1e-6 && sB <= abut[1] + 1e-6;
    const medPosA = edgesAt(sA, 1)[0], medPosB = edgesAt(sB, 1)[0];
    const medNegA = edgesAt(sA, -1)[0], medNegB = edgesAt(sB, -1)[0];

    S.kind = KIND.PLAIN;
    S.quad(atDeck(sA, -medNegA, yA + 0.3 * flatA), atDeck(sA, medPosA, yA + 0.3 * flatA), atDeck(sB, medPosB, yB + 0.3 * flatB), atDeck(sB, -medNegB, yB + 0.3 * flatB), blendCol(COLORS.strip, COLORS.paveStreet, sMid), [0, 1, 0]);

    for (const side of [-1, 1]) {
      const edgeA = edgesAt(sA, side), edgeB = edgesAt(sB, side);
      const edgeV = (arr, j) => side * (j < 0 ? HALF_WIDTH : arr[j]);
      for (const [ji, jo, raiseH, col0, col1, kind] of bands) {
        S.kind = kind;
        const col = blendCol(col0, col1, sMid), hA = raiseH * flatA, hB = raiseH * flatB;
        S.quad(atDeck(sA, edgeV(edgeA, ji), yA + hA), atDeck(sA, edgeV(edgeA, jo), yA + hA), atDeck(sB, edgeV(edgeB, jo), yB + hB), atDeck(sB, edgeV(edgeB, ji), yB + hB), col, [0, 1, 0]);
        S.kind = KIND.PLAIN;
        if (raiseH > 0 && Math.max(hA, hB) > 0.005) {
          for (const j of [ji, jo]) {
            if (j < 0) continue;
            S.quad(atDeck(sA, edgeV(edgeA, j), yA), atDeck(sB, edgeV(edgeB, j), yB), atDeck(sB, edgeV(edgeB, j), yB + hB), atDeck(sA, edgeV(edgeA, j), yA + hA), shade(col, 0.92), [0, 0.2, 0]);
          }
        }
      }
      S.kind = KIND.PLAIN;
      if (flatA + flatB > 0.01) {
        S.quad(atDeck(sA, side * edgeA[0], yA), atDeck(sB, side * edgeB[0], yB), atDeck(sB, side * edgeB[0], yB + 0.3 * flatB), atDeck(sA, side * edgeA[0], yA + 0.3 * flatA), COLORS.strip, [side * dirV[0], 0, side * dirV[1]]);
      }
      const botA = isSpan ? yA - 1.1 : Math.min(yA - 1.1, ground(sA) - 0.5);
      const botB = isSpan ? yB - 1.1 : Math.min(yB - 1.1, ground(sB) - 0.5);
      S.quad(atDeck(sA, side * HALF_WIDTH, botA), atDeck(sB, side * HALF_WIDTH, botB), atDeck(sB, side * HALF_WIDTH, yB + 0.2), atDeck(sA, side * HALF_WIDTH, yA + 0.2), isSpan ? COLORS.fascia : COLORS.concrete, [side * dirV[0], 0, side * dirV[1]]);
      if (isSpan) {
        S.quad(atDeck(sA, side * 10, yA - 1.1), atDeck(sB, side * 10, yB - 1.1), atDeck(sB, side * HALF_WIDTH, yB - 1.1), atDeck(sA, side * HALF_WIDTH, yA - 1.1), COLORS.under, [0, -1, 0]);
        S.quad(atDeck(sA, side * 10, yA - 2.4), atDeck(sB, side * 10, yB - 2.4), atDeck(sB, side * 10, yB - 1.1), atDeck(sA, side * 10, yA - 1.1), COLORS.steel, [side * dirV[0], 0, side * dirV[1]]);
      }
    }
    if (isSpan) S.quad(atDeck(sA, -10, yA - 2.4), atDeck(sB, -10, yB - 2.4), atDeck(sB, 10, yB - 2.4), atDeck(sA, 10, yA - 2.4), COLORS.under, [0, -1, 0]);
  }
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = KIND.PLAIN;

  for (const side of [-1, 1]) {
    for (const laneV of [4.5, 8]) {
      for (let s = -ends[0] + TRANS_LEN + 2; s < ends[1] - TRANS_LEN - 4; s += 10) {
        const y = top(s + 2) + 0.015, t = side * laneV;
        S.quad(at(s, t - 0.08, y), at(s, t + 0.08, y), at(s + 4, t + 0.08, top(s + 4) + 0.015), at(s + 4, t - 0.08, y), COLORS.line, [0, 1, 0]);
      }
    }
  }
  for (let k = 0; k < 64; k++) {
    const s = -halfLen + 2.7 + k * ((BRIDGE_LEN - 5.4) / 63), y = top(s);
    if (!isOpen(s)) continue;
    for (const side of [-1, 1]) S.beam(at(s, side * 10, y - 1.7), at(s, side * (HALF_WIDTH - 0.3), y - 1.35), 0.4, 0.5, COLORS.steel);
  }

  return { tilt, atDeck };
}

function buildPiersAndArches(S, ctx) {
  const { ang, abut, xz, at, top, ribPt, ribS } = ctx;

  const pierRing = (s, halfL, halfW, noseSegs = 6) => {
    const pts = [];
    for (const endSign of [1, -1]) {
      for (let i = 0; i <= noseSegs; i++) {
        const theta = -Math.PI / 2 + (Math.PI * i) / noseSegs;
        pts.push(xz(s + endSign * Math.sin(theta) * halfW, endSign * (halfL - halfW + Math.cos(theta) * halfW)));
      }
    }
    return pts;
  };

  for (const endSign of [-1, 1]) {
    const footS = endSign * ARCH_FOOT;
    S.prism(pierRing(footS, 18, 4.5, 6), -3, 0.4, COLORS.wet, COLORS.wet, { top: false });
    S.prism(pierRing(footS, 17.4, 4, 6), 0.4, Y_SPRING, COLORS.concrete, COLORS.concrete);
    S.box(...xz(footS, 0), Y_SPRING, Y_SPRING + 1.4, 3.2, 2 * V_RIB + 2.4, ang, COLORS.goldDark);

    for (const side of [-1, 1]) {
      const topS = endSign * V_PIER_TOP, topY = top(topS) - 2.4, segs = 6;
      for (let k = 0; k < segs; k++) {
        const t0 = k / segs, t1 = (k + 1) / segs;
        const p0 = at(footS + (topS - footS) * t0, side * V_RIB, Y_SPRING + 0.7 + (topY - Y_SPRING - 0.7) * t0);
        const p1 = at(footS + (topS - footS) * t1, side * V_RIB, Y_SPRING + 0.7 + (topY - Y_SPRING - 0.7) * t1);
        S.beam(p0, p1, 2.2, 3.2 - 1.2 * (t0 + t1) / 2, COLORS.gold);
      }
    }
    S.box(...xz(endSign * V_PIER_TOP, 0), top(endSign * V_PIER_TOP) - 3.4, top(endSign * V_PIER_TOP) - 2.4, 2.4, 2 * V_RIB + 2.2, ang, COLORS.goldDark, { bottom: true });

    const pierS = endSign * SIDE_PIER_S, pierY = top(pierS) - 2.4;
    S.prism(pierRing(pierS, 9, 1.2, 5), -3, 0.6, COLORS.wet, COLORS.wet, { top: false });
    S.prism(pierRing(pierS, 9, 1.2, 5), 0.6, pierY - 1.2, COLORS.concrete, COLORS.concrete, { top: false });
    S.box(...xz(pierS, 0), pierY - 1.2, pierY, 2.2, 22, ang, COLORS.concrete, { bottom: true });

    const abutS = abut[(endSign + 1) / 2] + endSign * 1.2;
    S.box(...xz(abutS, 0), LAND_Y - 3, top(abutS) - 1.1, 2.4, 2 * HALF_WIDTH + 0.6, ang, COLORS.concrete);
  }

  for (const side of [-1, 1]) {
    for (let k = 0; k < ARCH_SEGS; k++) {
      const s0 = ribS(k), s1 = ribS(k + 1), midRatio = Math.abs((s0 + s1) / 2) / ARCH_FOOT;
      S.beam(ribPt(s0, side), ribPt(s1, side), 2.0, 2.4 + 1.0 * midRatio * midRatio, mix(COLORS.gold, COLORS.goldDark, 0.5 * midRatio * midRatio));
    }
    for (let s = -71.5; s <= 71.6; s += 5.5) {
      const topPt = ribPt(s, side);
      S.beam([topPt[0], topPt[1] - 1.1, topPt[2]], at(s, side * V_RIB, top(s) + 0.28), 0.14, 0.14, COLORS.rail);
    }
  }
}

function buildRailingsAndWings(data, S, ctx, tilt, atDeck) {
  const { ang, ends, xz, at, ground, top } = ctx;

  const inWingGate = (s) => { const delta = Math.abs(s) - WING_S[s < 0 ? 0 : 1]; return delta > -PEEL_LEN - 0.5 && delta < WING_GATE; };
  for (const side of [-1, 1]) {
    const t = side * V_RAIL;
    for (let s = -ends[0] + 1; s <= ends[1] - 1; s += 2.5) {
      if (inWingGate(s)) continue;
      const y = top(s) + tilt(s, t) + 0.2, pt = xz(s, t);
      S.box(pt[0], pt[1], y, y + 1.15, 0.14, 0.14, ang, COLORS.rail);
    }
    for (let s = -ends[0] + 1; s < ends[1] - 1; s += 2.5) {
      const sNext = Math.min(ends[1] - 1, s + 2.5);
      if (inWingGate(s) || inWingGate(sNext)) continue;
      for (const [h, w] of ([[1.12, 0.14], [0.62, 0.07], [0.12, 0.1]] as any[])) {
        S.beam(atDeck(s, t, top(s) + 0.2 + h), atDeck(sNext, t, top(sNext) + 0.2 + h), w, w, COLORS.rail);
      }
    }
  }

  // Bank streets and buildings so wing terraces stop short of them
  const streets = [];
  for (const road of data.roads || []) {
    const [cls, isBridge, flat] = road;
    if (isBridge || cls > 3) continue;
    for (let k = 0; k + 3 < flat.length; k += 2) streets.push([flat[k] / 10, flat[k + 1] / 10, flat[k + 2] / 10, flat[k + 3] / 10, roadWidth(road) / 2]);
  }
  const segDist = (x, z, ax, az, bx, bz) => {
    const dx = bx - ax, dz = bz - az, lenSq = dx * dx + dz * dz || 1;
    const proj = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
    return Math.hypot(x - ax - dx * proj, z - az - dz * proj);
  };
  const houses = (data.bld || []).map((bld) => (Array.isArray(bld[0]) ? bld[0] : bld)).filter((flat) => Array.isArray(flat) && typeof flat[0] === 'number');
  const nearby = (pt, rad) => ({
    st: streets.filter((seg) => segDist(pt[0], pt[1], seg[0], seg[1], seg[2], seg[3]) < rad + seg[4] + 1),
    hs: houses.filter((flat) => { for (let k = 0; k < flat.length; k += 2) if (Math.hypot(flat[k] / 10 - pt[0], flat[k + 1] / 10 - pt[1]) < rad + 40) return true; return false; }),
  });
  const inPoly = (x, z, flat) => {
    let inside = false;
    for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) {
      const xi = flat[i] / 10, zi = flat[i + 1] / 10, xj = flat[j] / 10, zj = flat[j + 1] / 10;
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  const isClear = (s, t, nb) => {
    if (Math.abs(t) < HALF_WIDTH + 0.5) return false;
    const [x, z] = xz(s, t);
    for (const seg of nb.st) if (segDist(x, z, seg[0], seg[1], seg[2], seg[3]) < seg[4] + 0.3) return false;
    for (const flat of nb.hs) {
      if (inPoly(x, z, flat)) return false;
      for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) {
        if (segDist(x, z, flat[j] / 10, flat[j + 1] / 10, flat[i] / 10, flat[i + 1] / 10) < 0.6) return false;
      }
    }
    return true;
  };

  const halfWing = WING_W / 2;
  for (const endSign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const idx = (endSign + 1) / 2, wingStart = WING_S[idx], wingLen = WING_L[idx];
      const centerT = (dist) => 23.3 + 0.25 * dist + 0.0021 * dist * dist;
      const slopeAt = (dist) => 0.25 + 0.0042 * dist;
      const wingPt = (dist, off = 0) => {
        const slope = slopeAt(dist), normLen = Math.hypot(1, slope);
        return [endSign * (wingStart + dist) - endSign * slope * off / normLen, side * centerT(dist) + side * off / normLen];
      };
      const wingEnd = wingPt(wingLen), endSlope = slopeAt(wingLen), endNorm = Math.hypot(1, endSlope);
      const centerOff = endSign > 0 && side > 0 ? 8 : 9.5;
      const plazaCenter = [wingEnd[0] + endSign * centerOff / endNorm, wingEnd[1] + side * endSlope * centerOff / endNorm];
      const nb = nearby(xz(...(plazaCenter as [number, number])), PLAZA_R);

      const radialSegs = 48, radii = [];
      for (let j = 0; j < radialSegs; j++) {
        const theta = (2 * Math.PI * j) / radialSegs, ca = Math.cos(theta), sa = Math.sin(theta);
        let rad = 0;
        while (rad < PLAZA_R && isClear(plazaCenter[0] + ca * (rad + 0.25), plazaCenter[1] + sa * (rad + 0.25), nb)) rad += 0.25;
        radii.push(Math.max(3, rad));
      }
      const plazaRing = radii.map((rad, j) => {
        const theta = (2 * Math.PI * j) / radialSegs;
        return [plazaCenter[0] + Math.cos(theta) * rad, plazaCenter[1] + Math.sin(theta) * rad];
      });
      const plazaY = Math.max(ground(plazaCenter[0], plazaCenter[1]), ...plazaRing.filter((_, j) => j % 2 === 0).map(([s, t]) => ground(s, t) - 0.35)) + 0.25;

      const isInsidePlaza = (dist) => {
        const [s, t] = wingPt(dist);
        const theta = Math.atan2(t - plazaCenter[1], s - plazaCenter[0]);
        const j = Math.round((((theta / (2 * Math.PI)) * radialSegs) % radialSegs + radialSegs) % radialSegs) % radialSegs;
        return Math.hypot(s - plazaCenter[0], t - plazaCenter[1]) < radii[j] - 0.8;
      };
      let distIn = wingLen;
      for (let dist = 0; dist < wingLen + centerOff; dist += 0.5) if (isInsidePlaza(dist)) { distIn = dist; break; }
      const wingStartY = top(endSign * wingStart) + 0.2;
      const wingY = (dist) => (dist < 0 ? top(endSign * (wingStart + dist)) + 0.2 : wingStartY + (plazaY - wingStartY) * (1 - Math.cos(Math.PI * Math.min(1, dist / distIn))) / 2);

      const outer0 = wingPt(0, halfWing), flare0 = side * outer0[1] - HALF_WIDTH, deltaS0 = wingStart - endSign * outer0[0];
      const wingEdgesAt = (dist) => {
        if (dist < 0) {
          const frac = (dist + PEEL_LEN) / PEEL_LEN;
          return [[endSign * (wingStart + dist), side * HALF_WIDTH], [endSign * (wingStart + dist - deltaS0 * frac), side * (HALF_WIDTH + flare0 * frac ** 1.6)]];
        }
        const inner = wingPt(dist, -halfWing);
        if (side * inner[1] < HALF_WIDTH) inner[1] = side * HALF_WIDTH;
        return [inner, wingPt(dist, halfWing)];
      };

      const samples = [];
      for (let dist = -PEEL_LEN; dist < 0; dist += 2) samples.push(dist);
      for (let dist = 0; dist < distIn; dist += 2) samples.push(dist);
      samples.push(distIn + 0.8);

      S.kind = KIND.PLAIN;
      for (let j = 0; j + 1 < samples.length; j++) {
        const dA = samples[j], dB = samples[j + 1], yA = wingY(dA), yB = wingY(Math.min(dB, distIn));
        const [a0, a1] = wingEdgesAt(dA), [b0, b1] = wingEdgesAt(dB);
        S.kind = KIND.ROAD;
        S.quad(at(...(a0 as [number, number]), yA), at(...(a1 as [number, number]), yA), at(...(b1 as [number, number]), yB), at(...(b0 as [number, number]), yB), COLORS.granite, [0, 1, 0]);
        S.kind = KIND.PLAIN;
        S.quad(at(...(a0 as [number, number]), yA - 0.9), at(...(b0 as [number, number]), yB - 0.9), at(...(b1 as [number, number]), yB - 0.9), at(...(a1 as [number, number]), yA - 0.9), COLORS.under, [0, -1, 0]);
        S.quad(at(...(a1 as [number, number]), yA - 0.9), at(...(b1 as [number, number]), yB - 0.9), at(...(b1 as [number, number]), yB + 0.1), at(...(a1 as [number, number]), yA + 0.1), COLORS.fascia, [0, 0.1, 0]);
        if (dA >= WING_GATE) {
          S.quad(at(...(a0 as [number, number]), yA - 0.9), at(...(b0 as [number, number]), yB - 0.9), at(...(b0 as [number, number]), yB + 0.1), at(...(a0 as [number, number]), yA + 0.1), COLORS.fascia, [0, 0.1, 0]);
        }
        if (dB > distIn) continue;
        const rails: [number[], number[], number][] = [[a1, b1, -0.1]];
        if (dA >= WING_GATE) rails.push([a0, b0, 0.1]);
        for (const [p0, q0, inset] of rails) {
          const ptP = [p0[0], p0[1] + side * inset], ptQ = [q0[0], q0[1] + side * inset];
          S.box(...xz(...(ptP as [number, number])), yA, yA + 1.1, 0.12, 0.12, ang, COLORS.rail);
          for (const h of [1.08, 0.55]) S.beam(at(...(ptP as [number, number]), yA + h), at(...(ptQ as [number, number]), yB + h), 0.1, 0.1, COLORS.rail);
        }
      }

      for (let dist = 7; dist < distIn - 3; dist += 9) {
        const y = wingY(dist), [s, t] = wingPt(dist);
        if (y - 0.9 > ground(s, t) + 0.6) {
          const colPt = xz(s, t);
          S.cyl(colPt[0], colPt[1], -2, y - 0.9, 0.55, 0.55, 8, COLORS.concrete, { cap: false });
        }
      }

      const plazaPavedStart = S.n;
      S.prism(plazaRing.map(([s, t]) => xz(s, t)), -1.5, plazaY, COLORS.concrete, COLORS.granite);
      S.kind = KIND.PLAIN;
      const entryAng = Math.atan2(wingPt(distIn)[1] - plazaCenter[1], wingPt(distIn)[0] - plazaCenter[0]);
      for (let j = 0; j < radialSegs; j++) {
        const jNext = (j + 1) % radialSegs, midAng = (2 * Math.PI * (j + 0.5)) / radialSegs;
        if (Math.abs(Math.atan2(Math.sin(midAng - entryAng), Math.cos(midAng - entryAng))) < 0.3) continue;
        const ptP = plazaRing[j], ptQ = plazaRing[jNext], midRad = (radii[j] + radii[jNext]) / 2;
        const outerPt = [plazaCenter[0] + Math.cos(midAng) * (midRad + 1.2), plazaCenter[1] + Math.sin(midAng) * (midRad + 1.2)];
        if (midRad < PLAZA_R - 0.3 || ground(...(outerPt as [number, number])) > plazaY - 0.6) continue;
        const insetFrac = 0.15 / Math.max(radii[j], 1);
        S.beam(
          at(ptP[0] + (plazaCenter[0] - ptP[0]) * insetFrac, ptP[1] + (plazaCenter[1] - ptP[1]) * insetFrac, plazaY + 0.45),
          at(ptQ[0] + (plazaCenter[0] - ptQ[0]) * insetFrac, ptQ[1] + (plazaCenter[1] - ptQ[1]) * insetFrac, plazaY + 0.45),
          0.3, 0.9, COLORS.rail,
        );
      }
      (S.paved = S.paved || []).push([plazaPavedStart, S.n]);
    }
  }
  S.kind = KIND.PLAIN;
}

function buildLampsAndNightShow(S, group, ctx) {
  const { dirV, halfLen, xz, at, top, ribPt, ribS } = ctx;
  const glowPos = [], glowCol = [];
  const lampsPerRow = 15, sEnd = halfLen - 6, sNear = 86;

  for (const endSign of [-1, 1]) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < lampsPerRow; i++) {
        const frac = i / (lampsPerRow - 1);
        const s = endSign * (sEnd - (sEnd - sNear) * frac);
        const lampH = 4.6 + (14.2 - 4.6) * frac * frac;
        const pt = xz(s, side * V_RIB), y0 = top(s) + 0.28, headY = y0 + lampH;
        S.cyl(pt[0], pt[1], y0, y0 + 0.5, 0.28, 0.22, 6, COLORS.goldDark, { cap: false });
        S.cyl(pt[0], pt[1], y0 + 0.5, headY - 0.3, 0.1, 0.08, 6, COLORS.lampGold, { cap: false });
        S.cyl(pt[0], pt[1], headY - 0.75, headY - 0.35, 1.25, 1.3, 10, COLORS.goldDark, { cap: false });
        S.cyl(pt[0], pt[1], headY - 0.35, headY + 0.45, 1.3, 0.12, 10, COLORS.gold, { cap: false });
        S.cyl(pt[0], pt[1], headY + 0.45, headY + 0.95, 0.16, 0.02, 5, COLORS.goldDark);
        glowPos.push(pt[0], headY - 0.6, pt[1]);
        glowCol.push(1.0, 0.84, 0.5);
      }
    }
  }
  S.kind = KIND.PLAIN;

  const archBuf = new Buf(600), edgeBuf = new Buf(200), white = [1, 1, 1];
  for (const side of [-1, 1]) {
    for (let k = 0; k < ARCH_SEGS; k++) {
      const ptA = ribPt(ribS(k), side), ptB = ribPt(ribS(k + 1), side);
      if (Math.max(ptA[1], ptB[1]) < top(ribS(k)) - 0.5) continue;
      archBuf.beam([ptA[0], ptA[1] + 1.35, ptA[2]], [ptB[0], ptB[1] + 1.35, ptB[2]], 1.4, 0.2, white);
      for (const sgn of [-1, 1]) {
        const dx = dirV[0] * side * 1.05 * sgn, dz = dirV[1] * side * 1.05 * sgn;
        archBuf.beam([ptA[0] + dx, ptA[1], ptA[2] + dz], [ptB[0] + dx, ptB[1], ptB[2] + dz], 0.12, 0.8, white);
      }
    }
    for (let s = -71.5; s <= 71.6; s += 5.5) {
      const pt = ribPt(s, side);
      archBuf.beam([pt[0], pt[1] - 1.2, pt[2]], at(s, side * V_RIB, top(s) + 0.4), 0.06, 0.06, white);
    }
    for (let s = -halfLen; s < halfLen; s += 10) {
      edgeBuf.beam(at(s, side * (HALF_WIDTH + 0.05), top(s) - 0.35), at(s + 10, side * (HALF_WIDTH + 0.05), top(s + 10) - 0.35), 0.1, 0.22, white);
    }
  }

  const archMat = lightMaterial(0xffb637, 2.0);
  const archMesh = new THREE.Mesh(archBuf.geometry(), archMat);
  const edgeMesh = new THREE.Mesh(edgeBuf.geometry(), lightMaterial(0xfff0d0, 1.0));
  archMesh.renderOrder = edgeMesh.renderOrder = 19;
  archMesh.userData.landmark = edgeMesh.userData.landmark = id;
  const lampPts = glowPoints(glowPos, glowCol, 5);
  lampPts.userData.glow = true;
  lampPts.userData.landmark = id;
  group.add(archMesh, edgeMesh, lampPts);

  const palette = [0xffb637, 0xffb637, 0xff8a2a, 0xff5c8a, 0x9a6bff, 0x39c6c0, 0xffd36a].map((val) => new THREE.Color(val));
  const warmWhite = new THREE.Color(0xfff0d0), curCol = new THREE.Color();
  return {
    update(time, glow, rain) {
      if (glow <= 0.01) return;
      const period = 8;
      const stepIdx = Math.floor(time / period);
      const frac = (time / period) % 1;
      const ease = frac < 0.75 ? 0 : (frac - 0.75) / 0.25;
      curCol.copy(palette[stepIdx % palette.length]).lerp(palette[(stepIdx + 1) % palette.length], ease * ease * (3 - 2 * ease));
      if (rain) curCol.lerp(warmWhite, Math.min(1, rain));
      archMat.uniforms.uColor.value.copy(curCol);
    },
  };
}

export function build({ data, S, group }) {
  const { center, ang, dirU, dirV, halfLen, ends, approach } = computeFrame(data);
  const xz = (s, t): [number, number] => [center[0] + dirU[0] * s + dirV[0] * t, center[1] + dirU[1] * s + dirV[1] * t];
  const at = (s, t, y) => { const pt = xz(s, t); return [pt[0], y, pt[1]]; };
  const ground = (s, t = 0) => { const pt = xz(s, t), elev = rise(pt[0], pt[1]); return LAND_Y + elev + 0.07 + (elev > 0 ? 0.12 : 0); };
  const endOf = (s) => (s < 0 ? ends[0] : ends[1]);
  const curve = (s) => { const dist = Math.min(Math.abs(s), halfLen); return Y_END + (Y_MID - Y_END) * (1 - (dist / halfLen) ** 2); };
  const top = (s) => {
    const endDist = endOf(s), rampStart = endDist - RAMP_LEN, dist = Math.abs(s);
    if (dist <= rampStart) return curve(s);
    const y0 = curve(Math.sign(s) * rampStart), frac = Math.min(1, (dist - rampStart) / RAMP_LEN), gY = ground(Math.sign(s) * endDist);
    return y0 + (gY - y0) * (1 - Math.cos(Math.PI * frac)) / 2;
  };
  const isOpen = (s) => top(s) - 2.6 > ground(s);
  const abut = [-1, 1].map((endSign) => { let dist = 0; while (dist < halfLen && isOpen(endSign * (dist + 0.5))) dist += 0.5; return endSign * dist; });
  const ribPt = (s, side) => {
    const q = Math.max(0, 1 - (s / ARCH_FOOT) ** 2);
    return at(s, side * V_RIB, Y_SPRING + 0.7 + (Y_CROWN - Y_SPRING - 0.7) * q ** 0.9);
  };
  const ribS = (k) => -ARCH_FOOT + (2 * ARCH_FOOT * k) / ARCH_SEGS;

  const ctx = { center, ang, dirU, dirV, halfLen, ends, approach, abut, xz, at, ground, endOf, top, isOpen, ribPt, ribS };
  const { tilt, atDeck } = buildDeckAndGirders(S, ctx);
  buildPiersAndArches(S, ctx);
  buildRailingsAndWings(data, S, ctx, tilt, atDeck);
  return buildLampsAndNightShow(S, group, ctx);
}
