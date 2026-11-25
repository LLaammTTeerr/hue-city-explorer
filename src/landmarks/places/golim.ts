import { KIND, hex, shade, unflat, inRing } from '../../geo/buf.ts';
import { glowPoints } from '../../geo/materials.ts';
import { rise } from '../../geo/terrain.ts';
import { LAND_Y } from '../../config.ts';

// Cầu gỗ lim (cầu đi bộ gỗ lim): the ironwood walkway on the south bank of the Hương. KOICA-funded, opened
// November 2018. It stands in the water on concrete piles and runs from the Nguyễn Đình Chiểu promenade (by cầu
// Trường Tiền) upstream past the south end of cầu Phú Xuân to công viên Lý Tự Trọng. See docs/places/golim.md.
//
// Confirmed:
//  - nearly 400 m long ("over 380 m" / "380 m" in other reports), 4 m wide, about 1 m above the water, on concrete
//    piles in the riverbed; deck of about 16,000 South African lim boards; railing of about 4,100 gold-toned bronze
//    bars (7 t, made in Korea); waterproof lighting, railing lights and lamp posts (nguoiquansat.vn, mia.vn,
//    e.vnexpress.net 3824765, tuoitrenews 2018, LUCI association).
//  - the plan: OSM ways 683633953, 1167513733, 1167513732 and 1167513742 (footway, bridge=yes, "Ironwood Foot
//    Bridge"), 436 m end to end including the two ends that turn onto the bank. Connections to the bank, from OSM:
//    footways leave the deck at four nodes (ways 1493443036, 1493443034, 1493443035, 1473289702), the last a
//    short footbridge to the south end of cầu Phú Xuân.
// Estimated: pile bents every 4.5 m (two square piles and a headstock), ramps at both ends, gangways at the four
//   links, the deck's stand-off where the model's mapped bank is wider
//   than the real embankment (the OSM line runs within a metre of it there).
export const id = 'golim';

// OSM centreline (model metres), downstream end (Nguyễn Đình Chiểu) first
const CENTRELINE = [[-72.9, 281.6], [-80.7, 288.6], [-82.3, 297.3], [-115.5, 328.9], [-139.9, 351.4], [-151.4, 362.0],
  [-155.9, 365.6], [-178.7, 387.5], [-205.6, 413.0], [-207.1, 414.5], [-264.0, 467.4], [-281.6, 484.5],
  [-298.0, 500.2], [-363.3, 561.6], [-362.9, 568.1], [-357.2, 575.0], [-347.9, 586.6]];
// deck nodes where OSM footways lead to the bank
const BANK_LINKS = [[-139.9, 351.4], [-205.6, 413.0], [-264.0, 467.4], [-298.0, 500.2]];

const WIDTH = 4;
const HALF_WIDTH = WIDTH / 2;
const DECK_Y = 1.2;
const PILE_Y = -2.2;
const STEP = 1.5;
const RAMP_LEN = 16;
const BANK_CLEARANCE = 0.4;
const RAIL_H = 1.05;
const BAR_PITCH = 0.21; // slat tops; slat pitch: ~4,100 bars along both sides of ~430 m
// slat face: the Street View photosphere taken on the deck shows broad flat slats, close set, their tops standing
// free above a single thin rail; no cap rail and no posts stand out
const BAR_W = 0.07;
const RAIL_AT = 0.92;
// deck boards: the photosphere shows narrow lim boards laid across the walk, in panels with staggered end joints
const BOARD_W = 0.15;
const PANEL_SAMPLES = 2; // board width; samples (STEP each) per panel
const RAIL_OFFSET = HALF_WIDTH - 0.06;

// Colours as the walk looks now (Street View photosphere on the deck, Google satellite): the lim has weathered to a
// grey-brown and the bronze, gold-toned when new in 2018, has dulled to a dark brown-grey
const COLORS = {
  lim: hex('#967c63'),
  fascia: hex('#5e4c3d'),
  bronze: hex('#c2a36b'),
  bronzeDk: hex('#9a7f52'),
  seam: hex('#615041'),
  pile: hex('#a8a296'),
  head: hex('#928c80'),
};
const BOARD_SHADES = [1, 0.95, 0.98, 0.93, 0.96, 0.99];
const RAIL_GLOW_COLOR: [number, number, number] = [1.0, 0.72, 0.38];

// ------------------------------------------------------------------ plan
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const start = pts[i - 1];
    const end = pts[i];
    const segLen = Math.hypot(end[0] - start[0], end[1] - start[1]);
    let dist = step - carry;
    while (dist <= segLen) {
      out.push([start[0] + ((end[0] - start[0]) * dist) / segLen, start[1] + ((end[1] - start[1]) * dist) / segLen]);
      dist += step;
    }
    carry = segLen - (dist - step);
  }
  const lastInput = pts[pts.length - 1];
  const lastOut = out[out.length - 1];
  if (Math.hypot(lastInput[0] - lastOut[0], lastInput[1] - lastOut[1]) > step * 0.3) out.push(lastInput);
  return out;
}

function smooth(values, halfWindow, passes) {
  let current = values;
  for (let k = 0; k < passes; k++) {
    current = current.map((val, i) => {
      const lo = Math.max(0, i - halfWindow);
      const hi = Math.min(current.length - 1, i + halfWindow);
      if (Array.isArray(val)) {
        let x = 0;
        let z = 0;
        for (let j = lo; j <= hi; j++) {
          x += current[j][0];
          z += current[j][1];
        }
        return [x / (hi - lo + 1), z / (hi - lo + 1)];
      }
      let sum = 0;
      for (let j = lo; j <= hi; j++) sum += current[j];
      return sum / (hi - lo + 1);
    });
  }
  return current;
}

const segDist = (pt, segA, segB) => {
  const dx = segB[0] - segA[0];
  const dz = segB[1] - segA[1];
  const lenSq = dx * dx + dz * dz;
  const frac = lenSq > 0 ? Math.max(0, Math.min(1, ((pt[0] - segA[0]) * dx + (pt[1] - segA[1]) * dz) / lenSq)) : 0;
  return Math.hypot(pt[0] - segA[0] - dx * frac, pt[1] - segA[1] - dz * frac);
};

function landNear(data) {
  const nearPolys = [];
  for (const poly of data.land || []) {
    const rings = poly.map(unflat);
    if (rings[0].some((pt) => Math.abs(pt[0] + 215) < 500 && Math.abs(pt[1] - 435) < 500)) nearPolys.push(rings);
  }
  const isLand = (x, z) => nearPolys.some((rings) => inRing(x, z, rings[0]) && !rings.slice(1).some((hole) => inRing(x, z, hole)));
  const bankDist = (pt) => {
    let best = Infinity;
    for (const rings of nearPolys) {
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const segA = ring[i];
          const segB = ring[(i + 1) % ring.length];
          if (Math.abs(segA[0] - pt[0]) > 40 && Math.abs(segB[0] - pt[0]) > 40) continue;
          if (Math.abs(segA[1] - pt[1]) > 40 && Math.abs(segB[1] - pt[1]) > 40) continue;
          best = Math.min(best, segDist(pt, segA, segB));
        }
      }
    }
    return best;
  };
  return { isLand, bank: bankDist };
}

// [{ p, t (downstream → upstream), n (towards the water), y (deck top), wet (stands over water) }], STEP apart
export function golimPath(data) {
  const { isLand, bank } = landNear(data);
  const baseLine = smooth(resample(CENTRELINE, STEP), 2, 2);
  baseLine[0] = CENTRELINE[0];
  baseLine[baseLine.length - 1] = CENTRELINE[CENTRELINE.length - 1];
  const sampleCount = baseLine.length;
  const tangentAt = (pts, i) => {
    const prev = pts[Math.max(0, i - 2)];
    const next = pts[Math.min(pts.length - 1, i + 2)];
    const len = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
    return [(next[0] - prev[0]) / len, (next[1] - prev[1]) / len];
  };
  let tangents = baseLine.map((_, i) => tangentAt(baseLine, i));
  // the river lies to the right going upstream (north-west of the line): check by vote
  let vote = 0;
  for (let i = 0; i < sampleCount; i += 3) {
    const pt = baseLine[i];
    const tan = tangents[i];
    vote += isLand(pt[0] - tan[1] * 15, pt[1] + tan[0] * 15) ? -1 : 1;
  }
  const riverSign = vote >= 0 ? 1 : -1;
  const normalOf = (tan): [number, number] => [-tan[1] * riverSign, tan[0] * riverSign];

  // samples whose OSM centre is on the model's land are the ends where the walk turns onto the bank
  const rawWet = baseLine.map((pt) => !isLand(pt[0], pt[1]));
  const firstWet = rawWet.indexOf(true);
  const lastWet = rawWet.lastIndexOf(true);
  if (firstWet < 0) throw new Error('golim: OSM line not over water');
  // over the water, push the deck out just enough that its bank-side edge clears the mapped embankment
  const rawOffsets = baseLine.map((pt, i) => {
    if (i < firstWet || i > lastWet) return 0;
    const norm = normalOf(tangents[i]);
    let offset = 0;
    for (; offset < 6; offset += 0.25) {
      const bankEdge = [pt[0] + norm[0] * (offset - HALF_WIDTH), pt[1] + norm[1] * (offset - HALF_WIDTH)];
      if (!isLand(bankEdge[0], bankEdge[1]) && bank(bankEdge) >= BANK_CLEARANCE) break;
    }
    return offset;
  });
  const maxWindow = 8;
  const maxOffsets = rawOffsets.map((_, i) => Math.max(...rawOffsets.slice(Math.max(firstWet, i - maxWindow), Math.min(lastWet + 1, i + maxWindow + 1)).concat([0])));
  const smoothOffsets = smooth(maxOffsets, 6, 3).map((val, i) => (i < firstWet || i > lastWet ? 0 : val));
  // fade the push in and out across the ends so the deck still meets the bank where OSM has it
  for (let k = 0; k < 10; k++) {
    smoothOffsets[Math.min(sampleCount - 1, firstWet + k)] *= (k + 1) / 10;
    smoothOffsets[Math.max(0, lastWet - k)] *= (k + 1) / 10;
  }
  const shiftedLine = baseLine.map((pt, i) => {
    const norm = normalOf(tangents[i]);
    return [pt[0] + norm[0] * smoothOffsets[i], pt[1] + norm[1] * smoothOffsets[i]];
  });
  tangents = shiftedLine.map((_, i) => tangentAt(shiftedLine, i));

  // deck height: about 1 m over the water, ramping up to the promenade over the last RAMP_LEN metres of each end
  const isWet = shiftedLine.map((pt) => !isLand(pt[0], pt[1]));
  const wetStart = isWet.indexOf(true);
  const wetEnd = isWet.lastIndexOf(true);
  const landHeight = (pt) => LAND_Y + rise(pt[0], pt[1]) + 0.06;
  const startEndY = landHeight(shiftedLine[0]);
  const finishEndY = landHeight(shiftedLine[sampleCount - 1]);
  const rampWeight = (dist) => {
    const frac = Math.max(0, 1 - dist / RAMP_LEN);
    return frac * frac * (3 - 2 * frac);
  };
  return shiftedLine.map((pt, i) => {
    let y = DECK_Y;
    if (i <= wetStart) y = Math.max(DECK_Y, landHeight(pt));
    else if (i >= wetEnd) y = Math.max(DECK_Y, landHeight(pt));
    else {
      const distStart = (i - wetStart) * STEP;
      const distEnd = (wetEnd - i) * STEP;
      y = DECK_Y + (startEndY - DECK_Y) * rampWeight(distStart) + (finishEndY - DECK_Y) * rampWeight(distEnd);
    }
    return { p: pt, t: tangents[i], n: normalOf(tangents[i]), y, wet: i > wetStart && i < wetEnd };
  });
}

// ------------------------------------------------------------------ model
function buildDeck(S, path, ptAt, horizNorm) {
  // deck: a quad per sample, toned per panel; transverse board seams; panel joints, the boards' end joints running
  // along the walk and staggered from panel to panel; dark edge beams on both sides, end caps
  const count = path.length;
  const lerp3 = (a, b, frac): [number, number, number] => [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac, a[2] + (b[2] - a[2]) * frac];
  const boardsPerStep = Math.max(1, Math.round(STEP / BOARD_W));
  for (let i = 0; i + 1 < count; i++) {
    const panelIdx = Math.floor(i / PANEL_SAMPLES);
    const boardColor = shade(COLORS.lim, BOARD_SHADES[panelIdx % BOARD_SHADES.length]);
    S.quad(ptAt(i, -HALF_WIDTH), ptAt(i + 1, -HALF_WIDTH), ptAt(i + 1, HALF_WIDTH), ptAt(i, HALF_WIDTH), boardColor, [0, 1, 0]);
    const left0 = ptAt(i, -HALF_WIDTH, 0.004);
    const left1 = ptAt(i + 1, -HALF_WIDTH, 0.004);
    const right0 = ptAt(i, HALF_WIDTH, 0.004);
    const right1 = ptAt(i + 1, HALF_WIDTH, 0.004);
    for (let k = 0; k < boardsPerStep; k++) {
      const isPanelJoint = k === 0 && i % PANEL_SAMPLES === 0;
      const seamHalf = (isPanelJoint ? 0.025 : 0.009) / STEP;
      const frac = k / boardsPerStep;
      const f0 = Math.max(0, frac - seamHalf);
      const f1 = Math.min(1, frac + seamHalf);
      S.quad(lerp3(left0, left1, f0), lerp3(left0, left1, f1), lerp3(right0, right1, f1), lerp3(right0, right1, f0), isPanelJoint ? COLORS.seam : shade(COLORS.seam, 1.12), [0, 1, 0]);
    }
    // end joints: boards about 1.3-2 m long, joints shifted every other panel
    for (const offset of panelIdx % 2 ? [-0.7, 0.9] : [-1.0, 0.4, 1.4]) {
      const halfJoint = 0.006;
      S.quad(ptAt(i, offset - halfJoint, 0.005), ptAt(i + 1, offset - halfJoint, 0.005), ptAt(i + 1, offset + halfJoint, 0.005), ptAt(i, offset + halfJoint, 0.005), shade(COLORS.seam, 1.15), [0, 1, 0]);
    }
    for (const side of [-1, 1]) {
      S.quad(ptAt(i, side * HALF_WIDTH), ptAt(i + 1, side * HALF_WIDTH), ptAt(i + 1, side * HALF_WIDTH, -0.45), ptAt(i, side * HALF_WIDTH, -0.45), COLORS.fascia, horizNorm(i, side));
    }
    S.quad(ptAt(i, -HALF_WIDTH, -0.45), ptAt(i + 1, -HALF_WIDTH, -0.45), ptAt(i + 1, HALF_WIDTH, -0.45), ptAt(i, HALF_WIDTH, -0.45), COLORS.fascia, [0, -1, 0]);
  }
  for (const [endIdx, sign] of ([[0, -1], [count - 1, 1]] as any[])) {
    const endNorm = [path[endIdx].t[0] * sign, 0, path[endIdx].t[1] * sign];
    S.quad(ptAt(endIdx, -HALF_WIDTH), ptAt(endIdx, HALF_WIDTH), ptAt(endIdx, HALF_WIDTH, -0.45), ptAt(endIdx, -HALF_WIDTH, -0.45), COLORS.fascia, endNorm);
  }
}

function buildPiles(S, path, ptAt, isLand) {
  // piles: a bent every 4.5 m over the water, two square concrete piles under a headstock
  const count = path.length;
  S.kind = KIND.MASONRY;
  for (let i = 2; i < count - 2; i += 3) {
    if (!path[i].wet) continue;
    const tan = path[i].t;
    const angle = Math.atan2(tan[1], tan[0]);
    const y = path[i].y - 0.45;
    const center = ptAt(i, 0);
    S.box(center[0], center[2], y - 0.4, y, 0.4, WIDTH - 0.3, angle, COLORS.head, { bottom: true });
    for (const side of [-1, 1]) {
      const pilePt = ptAt(i, side * (HALF_WIDTH - 0.5));
      if (isLand(pilePt[0], pilePt[2])) continue;
      S.box(pilePt[0], pilePt[2], PILE_Y, y - 0.4, 0.35, 0.35, angle, COLORS.pile);
    }
  }
}

function buildRailings(S, path, ptAt, horizNorm, isOpening, isRailOff) {
  // railings: broad flat bronze slats standing on the deck edge, their tops free above one thin rail; no cap, no posts
  const count = path.length;
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    const shouldSkip = (i) => isRailOff(i) || (side < 0 && isOpening(i));
    for (let i = 0; i + 1 < count; i++) {
      if (shouldSkip(i) || shouldSkip(i + 1)) continue;
      const startPt = ptAt(i, side * RAIL_OFFSET);
      const endPt = ptAt(i + 1, side * RAIL_OFFSET);
      // the rail runs on the deck side of the slats
      const railInset = -side * 0.025;
      S.beam(
        [startPt[0] + path[i].n[0] * railInset, startPt[1] + RAIL_AT, startPt[2] + path[i].n[1] * railInset],
        [endPt[0] + path[i + 1].n[0] * railInset, endPt[1] + RAIL_AT, endPt[2] + path[i + 1].n[1] * railInset],
        0.035,
        0.03,
        COLORS.bronzeDk,
      );
      // slats: flat back-to-back blades, BAR_PITCH apart
      const segLen = Math.hypot(endPt[0] - startPt[0], endPt[2] - startPt[2]);
      const barStart = Math.ceil((i * STEP) / BAR_PITCH);
      const barEnd = Math.floor(((i + 1) * STEP - 1e-6) / BAR_PITCH);
      for (let k = barStart; k <= barEnd; k++) {
        const frac = (k * BAR_PITCH - i * STEP) / segLen;
        const x = startPt[0] + (endPt[0] - startPt[0]) * frac;
        const y = startPt[1] + (endPt[1] - startPt[1]) * frac;
        const z = startPt[2] + (endPt[2] - startPt[2]) * frac;
        const tan = path[i].t;
        const halfBarW = BAR_W / 2;
        const p0 = [x - tan[0] * halfBarW, y, z - tan[1] * halfBarW];
        const p1 = [x + tan[0] * halfBarW, y, z + tan[1] * halfBarW];
        const q1 = [p1[0], y + RAIL_H, p1[2]];
        const q0 = [p0[0], y + RAIL_H, p0[2]];
        S.quad(p0, p1, q1, q0, COLORS.bronze, horizNorm(i, 1));
        S.quad(p1, p0, q0, q1, COLORS.bronze, horizNorm(i, -1));
      }
    }
  }
}

function buildGangways(S, path, linkIndices, isLand) {
  // gangways at the four links: from the deck's bank-side edge across the gap to the embankment
  for (const linkIdx of linkIndices) {
    const sample = path[linkIdx];
    const norm = sample.n;
    const tan = sample.t;
    const angle = Math.atan2(tan[1], tan[0]);
    const deckEdge = [sample.p[0] - norm[0] * HALF_WIDTH, sample.p[1] - norm[1] * HALF_WIDTH];
    let gap = 0;
    for (; gap < 20; gap += 0.25) if (isLand(deckEdge[0] - norm[0] * gap, deckEdge[1] - norm[1] * gap)) break;
    if (gap >= 20) continue;
    const run = gap + 0.8; // into the bank a little, so it lands on the promenade
    const bankY = LAND_Y + rise(deckEdge[0] - norm[0] * run, deckEdge[1] - norm[1] * run) + 0.06;
    const stepCount = Math.max(2, Math.ceil(run / 0.5));
    for (let j = 0; j < stepCount; j++) {
      const frac = (j + 0.5) / stepCount;
      const y = sample.y + (bankY - sample.y) * ((j + 1) / stepCount);
      const cx = deckEdge[0] - norm[0] * run * frac;
      const cz = deckEdge[1] - norm[1] * run * frac;
      S.box(cx, cz, y - 0.25, y, 2.4, run / stepCount + 0.02, angle, shade(COLORS.lim, BOARD_SHADES[j % BOARD_SHADES.length]), { bottom: true });
    }
    for (const side of [-1, 1]) {
      const deckPost = [deckEdge[0] + tan[0] * side * 1.15, deckEdge[1] + tan[1] * side * 1.15];
      const bankPost = [deckPost[0] - norm[0] * gap, deckPost[1] - norm[1] * gap];
      const bankPostY = sample.y + (bankY - sample.y) * (gap / run);
      S.beam([deckPost[0], sample.y + RAIL_H, deckPost[1]], [bankPost[0], bankPostY + RAIL_H, bankPost[1]], 0.08, 0.06, COLORS.bronze);
      for (const isBankEnd of [0, 1]) {
        const postPos = isBankEnd ? bankPost : deckPost;
        const postY = isBankEnd ? bankPostY : sample.y;
        S.box(postPos[0], postPos[1], postY, postY + RAIL_H + 0.06, 0.1, 0.1, angle, COLORS.bronzeDk);
      }
    }
  }
}

function collectRailGlows(path, ptAt, isOpening, isRailOff) {
  // lighting: low lights in the railing every 6 m on both sides. The photosphere on the deck shows over 100 m of
  // river-side railing with no lamp post, so the reported lamp posts are left to the promenade.
  const glowPos = [];
  const glowCol = [];
  for (let i = 6; i < path.length - 4; i += 4) {
    if (isRailOff(i)) continue;
    for (const side of [-1, 1]) {
      if (side < 0 && isOpening(i)) continue;
      const pos = ptAt(i, side * (RAIL_OFFSET - 0.08), 0.35);
      glowPos.push(pos[0], pos[1], pos[2]);
      glowCol.push(...RAIL_GLOW_COLOR);
    }
  }
  return { glowPos, glowCol };
}

export function build({ data, S, group }) {
  const path = golimPath(data);
  const { isLand } = landNear(data);
  const count = path.length;
  const pavedStart = S.n;
  S.base = 0;
  S.kind = KIND.PLAIN;
  const ptAt = (i, offset, dy = 0): [number, number, number] => [path[i].p[0] + path[i].n[0] * offset, path[i].y + dy, path[i].p[1] + path[i].n[1] * offset];
  const horizNorm = (i, sign): [number, number, number] => [path[i].n[0] * sign, 0, path[i].n[1] * sign];

  // where the links meet the deck: the nearest sample, and openings in the bank-side railing
  const linkIndices = BANK_LINKS.map((linkPt) => {
    let best = 0;
    let bestDist = Infinity;
    path.forEach((sample, i) => {
      const dist = Math.hypot(sample.p[0] - linkPt[0], sample.p[1] - linkPt[1]);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  });
  const isOpening = (i) => linkIndices.some((k) => Math.abs(i - k) <= 1);
  const isRailOff = (i) => i < 2 || i > count - 3; // the two ends meet the promenade: open

  buildDeck(S, path, ptAt, horizNorm);
  buildPiles(S, path, ptAt, isLand);
  buildRailings(S, path, ptAt, horizNorm, isOpening, isRailOff);
  buildGangways(S, path, linkIndices, isLand);

  const { glowPos, glowCol } = collectRailGlows(path, ptAt, isOpening, isRailOff);
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  S.kind = KIND.PLAIN;

  const pts = glowPoints(glowPos, glowCol, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
}
