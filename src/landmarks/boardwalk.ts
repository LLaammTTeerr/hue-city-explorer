import { KIND, hex, shade, unflat, inRing } from '../geo/buf.ts';
import { glowPoints } from '../geo/materials.ts';
import { LAND_Y } from '../config.ts';
import { replaced } from './places/index.ts';

// Cầu đi bộ gỗ lim — the ironwood riverside walkway on the south bank of the Hương, inaugurated
// 15 Nov 2018 (KOICA-funded). A timber deck on concrete piles standing just off the Nguyễn Đình Chiểu
// promenade, between cầu Trường Tiền and cầu Phú Xuân.
//
// Facts used (see docs/reference/bridges.md):
//  - length "nearly 400 m", width 4 m, ~2,443 m² of South African lim. 400 m is used.
//  - deck about 1 m above the water.
//  - runs from the middle of the Nguyễn Đình Chiểu promenade upstream, passing under cầu Phú Xuân, towards
//    công viên Lý Tự Trọng.
//
// The plan follows the mapped south bank: the land ring nearest the promenade label is walked either way
// from the label's foot, smoothed, and pushed out over the water just far enough that the whole 4 m deck
// clears the embankment; LENGTH metres of that line are kept, ending PAST_PX metres beyond cầu Phú Xuân.
const LENGTH = 400;
const WIDTH = 4;
const HALF_WIDTH = WIDTH / 2;
const DECK_Y = 1.2;
const PILE_Y = -1.5;
const GAP = 2.0;
const PAST_PX = 20;

const ANCHOR_SEARCH_REACH = 900;
const DIRECTION_PROBE_LEN = 120;
const BANK_AHEAD_EXTRA = 180;
const BANK_BEHIND_LEN = 160;
const SAMPLE_STEP = 1.5;
const WATER_VOTE_PROBE = 8;
const MAX_WATER_OFFSET = 14;
const WATER_OFFSET_STEP = 0.25;
const WATER_EDGE_CLEAR = 0.5;
const OFFSET_MAX_WINDOW = 12;
const SPAN_END_MARGIN = 20;
const MIN_PATH_SAMPLES = 10;

const FASCIA_DROP = 0.3;
const RAIL_TOP_OFFSET = 1.0;
const RAIL_BAR_HEIGHT = 0.1;
const RAIL_INSET = 0.08;
const POST_EVERY_SAMPLES = 4; // 6 m
const POST_HALF_SIZE = 0.07;
const PILE_EDGE_INSET = 0.45;
const PILE_HALF_SIZE = 0.2;
const STAIR_STEPS = 14;
const STAIR_TREAD = 0.34;
const STAIR_LANDING_LEN = 1.6;
const BOLLARD_HEIGHT = 0.55;
const BOLLARD_POST_HEIGHT = 0.5;
const BOLLARD_SIZE = 0.18;

const BOARDWALK_PAL = {
  wood: hex('#7d5336'),
  woodShades: [1, 0.88, 0.95, 0.84, 0.92],
  bronze: hex('#4a3a28'),
  pile: hex('#9a958c'),
};

// ------------------------------------------------------------------ geometry helpers (pure)
function segDist(pt, segA, segB) {
  const dx = segB[0] - segA[0];
  const dz = segB[1] - segA[1];
  const lenSq = dx * dx + dz * dz;
  let param = lenSq > 0 ? ((pt[0] - segA[0]) * dx + (pt[1] - segA[1]) * dz) / lenSq : 0;
  param = Math.max(0, Math.min(1, param));
  return { dist: Math.hypot(pt[0] - segA[0] - dx * param, pt[1] - segA[1] - dz * param), param };
}

// evenly spaced points (not geo/bridges.js's resample, which keeps the vertices and returns arc lengths)
function resample(pts, step) {
  if (!pts.length) return [];
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const segA = pts[i - 1];
    const segB = pts[i];
    const segLen = Math.hypot(segB[0] - segA[0], segB[1] - segA[1]);
    let cursor = step - carry;
    while (cursor <= segLen) {
      out.push([segA[0] + ((segB[0] - segA[0]) * cursor) / segLen, segA[1] + ((segB[1] - segA[1]) * cursor) / segLen]);
      cursor += step;
    }
    carry = segLen - (cursor - step);
  }
  return out;
}

function smooth(arr, half, passes) {
  let cur = arr;
  for (let pass = 0; pass < passes; pass++) {
    cur = cur.map((_, idx) => {
      const lo = Math.max(0, idx - half);
      const hi = Math.min(cur.length - 1, idx + half);
      const span = hi - lo + 1;
      if (Array.isArray(cur[0])) {
        let sumX = 0;
        let sumZ = 0;
        for (let j = lo; j <= hi; j++) { sumX += cur[j][0]; sumZ += cur[j][1]; }
        return [sumX / span, sumZ / span];
      }
      let sum = 0;
      for (let j = lo; j <= hi; j++) sum += cur[j];
      return sum / span;
    });
  }
  return cur;
}

// Land near a point: polygons (outer ring + holes, in metres) whose bounds come within `reach`.
function landNear(data, center, reach) {
  const out = [];
  for (const poly of data.land) {
    const rings = poly.map(unflat);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const pt of rings[0]) {
      x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]);
      z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]);
    }
    if (center[0] < x0 - reach || center[0] > x1 + reach || center[1] < z0 - reach || center[1] > z1 + reach) continue;
    out.push(rings);
  }
  return out;
}

function isLand(land, x, z) {
  for (const rings of land) {
    if (!inRing(x, z, rings[0])) continue;
    let inHole = false;
    for (let holeIdx = 1; holeIdx < rings.length && !inHole; holeIdx++) inHole = inRing(x, z, rings[holeIdx]);
    if (!inHole) return true;
  }
  return false;
}

function bankDist(land, pt) {
  let best = Infinity;
  for (const rings of land) {
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const dist = segDist(pt, ring[i], ring[(i + 1) % ring.length]).dist;
        if (dist < best) best = dist;
      }
    }
  }
  return best;
}

function findNearestBankEdge(land, anchor) {
  let best = null;
  for (const rings of land) {
    const ring = rings[0];
    for (let i = 0; i < ring.length; i++) {
      const nextIdx = (i + 1) % ring.length;
      const { dist, param } = segDist(anchor, ring[i], ring[nextIdx]);
      if (!best || dist < best.dist) best = { dist, param, ring, idx: i, nextIdx };
    }
  }
  return best;
}

function walkBankRing(edge, foot, dir, targetLen) {
  const { ring } = edge;
  const pts = [foot];
  let vertIdx = dir > 0 ? edge.nextIdx : edge.idx;
  let acc = 0;
  let prev = foot;
  for (let guard = 0; guard < ring.length && acc < targetLen; guard++) {
    const nextPt = ring[vertIdx];
    const segLen = Math.hypot(nextPt[0] - prev[0], nextPt[1] - prev[1]);
    if (acc + segLen >= targetLen) {
      const frac = (targetLen - acc) / segLen;
      pts.push([prev[0] + (nextPt[0] - prev[0]) * frac, prev[1] + (nextPt[1] - prev[1]) * frac]);
      break;
    }
    pts.push(nextPt);
    acc += segLen;
    prev = nextPt;
    vertIdx = (vertIdx + dir + ring.length) % ring.length;
  }
  return pts;
}

function offsetBankOverWater(bankSamples, land) {
  const count = bankSamples.length;
  const tangents = bankSamples.map((_, idx) => {
    const prev = bankSamples[Math.max(0, idx - 2)];
    const next = bankSamples[Math.min(count - 1, idx + 2)];
    const len = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
    return [(next[0] - prev[0]) / len, (next[1] - prev[1]) / len];
  });
  let waterVote = 0;
  for (let i = 0; i < count; i += 4) {
    const pt = bankSamples[i];
    const tan = tangents[i];
    waterVote += isLand(land, pt[0] - tan[1] * WATER_VOTE_PROBE, pt[1] + tan[0] * WATER_VOTE_PROBE) ? -1 : 1;
  }
  const waterSign = waterVote >= 0 ? 1 : -1;
  const normals = tangents.map((tan) => [-tan[1] * waterSign, tan[0] * waterSign]);

  // offset each sample until the bank-side edge of the deck is GAP clear of land, then smooth the offsets
  const rawOffsets = bankSamples.map((pt, idx) => {
    let offset = HALF_WIDTH + GAP;
    for (; offset < MAX_WATER_OFFSET; offset += WATER_OFFSET_STEP) {
      const clear = [-HALF_WIDTH, 0, HALF_WIDTH].every((edge) => {
        const probe = [pt[0] + normals[idx][0] * (offset + edge), pt[1] + normals[idx][1] * (offset + edge)];
        return !isLand(land, probe[0], probe[1]) && bankDist(land, probe) >= (edge < 0 ? GAP : WATER_EDGE_CLEAR);
      });
      if (clear) break;
    }
    return offset;
  });

  // widen by a running max first so the smoothing never dips back under a protrusion
  const runningMax = rawOffsets.map((_, idx) =>
    Math.max(...rawOffsets.slice(Math.max(0, idx - OFFSET_MAX_WINDOW), Math.min(count, idx + OFFSET_MAX_WINDOW + 1))),
  );
  const smoothOffsets = smooth(runningMax, 8, 3);
  const shifted = bankSamples.map((pt, idx) => [pt[0] + normals[idx][0] * smoothOffsets[idx], pt[1] + normals[idx][1] * smoothOffsets[idx]]);
  return { centerLine: smooth(shifted, 3, 2), waterSign };
}

// The walkway's centreline: [{ p:[x,z], t:[tx,tz] (upstream), n:[nx,nz] (towards the water), bank }], ~1.5 m apart.
function boardwalkPath(data) {
  const truongTien = data.truongtien;
  const southEnd = [truongTien.b[0] / 10, truongTien.b[1] / 10];
  const promLabel = data.places.find((place) => place.id === 'ndchieu');
  const anchor = promLabel ? [promLabel.x / 10, promLabel.z / 10] : southEnd;
  const land = landNear(data, anchor, ANCHOR_SEARCH_REACH);

  const edge = findNearestBankEdge(land, anchor);
  if (!edge) return null;
  const startVert = edge.ring[edge.idx];
  const endVert = edge.ring[edge.nextIdx];
  const foot = [startVert[0] + (endVert[0] - startVert[0]) * edge.param, startVert[1] + (endVert[1] - startVert[1]) * edge.param];

  // upstream is the way that leads away from the bridge
  const tryFwd = walkBankRing(edge, foot, 1, DIRECTION_PROBE_LEN);
  const tryBack = walkBankRing(edge, foot, -1, DIRECTION_PROBE_LEN);
  const distFromBridge = (pts) => { const tail = pts[pts.length - 1]; return Math.hypot(tail[0] - southEnd[0], tail[1] - southEnd[1]); };
  const upstreamDir = distFromBridge(tryFwd) > distFromBridge(tryBack) ? 1 : -1;

  const fwd = walkBankRing(edge, foot, upstreamDir, LENGTH + BANK_AHEAD_EXTRA);
  const back = walkBankRing(edge, foot, -upstreamDir, BANK_BEHIND_LEN);
  const bankLine = back.slice(1).reverse().concat(fwd);

  const bankSamples = smooth(resample(bankLine, SAMPLE_STEP), 10, 3);
  const { centerLine, waterSign } = offsetBankOverWater(bankSamples, land);
  const count = centerLine.length;

  // window: passes under cầu Phú Xuân and ends PAST_PX metres beyond it
  const arcLen = [0];
  for (let i = 1; i < count; i++) {
    arcLen.push(arcLen[i - 1] + Math.hypot(centerLine[i][0] - centerLine[i - 1][0], centerLine[i][1] - centerLine[i - 1][1]));
  }
  const backLen = back.reduce((sum, pt, idx) => (idx ? sum + Math.hypot(pt[0] - back[idx - 1][0], pt[1] - back[idx - 1][1]) : 0), 0);
  const footIdx = Math.round(Math.max(0, backLen) / SAMPLE_STEP);
  const phuXuan = (data.bridges || []).find((bridge) => bridge.n === 'Cầu Phú Xuân');
  let spanEnd = arcLen[Math.min(count - 1, footIdx)] + LENGTH;
  if (phuXuan) {
    const ring = unflat(phuXuan.ring);
    let lastInside = -1;
    for (let i = footIdx; i < count; i++) if (inRing(centerLine[i][0], centerLine[i][1], ring)) lastInside = i;
    if (lastInside > 0) spanEnd = arcLen[lastInside] + PAST_PX;
  }
  spanEnd = Math.min(spanEnd, arcLen[count - 1] - SPAN_END_MARGIN);
  const spanStart = Math.max(arcLen[0] + SPAN_END_MARGIN, spanEnd - LENGTH);
  const clipped = [];
  for (let i = 0; i < count; i++) if (arcLen[i] >= spanStart && arcLen[i] <= spanEnd) clipped.push(centerLine[i]);
  if (clipped.length < 2) return null;

  const resampled = resample(clipped, SAMPLE_STEP);
  const finalCount = resampled.length;
  return resampled.map((pt, idx) => {
    const prev = resampled[Math.max(0, idx - 1)];
    const next = resampled[Math.min(finalCount - 1, idx + 1)];
    const len = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
    const tan = [(next[0] - prev[0]) / len, (next[1] - prev[1]) / len];
    return { p: pt, t: tan, n: [-tan[1] * waterSign, tan[0] * waterSign], bank: bankDist(land, pt) };
  });
}

// ------------------------------------------------------------------ the model
function deckPoint(path, idx, lateralOff, y) {
  return [path[idx].p[0] + path[idx].n[0] * lateralOff, y, path[idx].p[1] + path[idx].n[1] * lateralOff];
}

function buildDeck(S, path) {
  const { wood, woodShades } = BOARDWALK_PAL;
  const fascia = shade(wood, 0.7);
  S.kind = KIND.PLAIN;
  for (let i = 0; i < path.length - 1; i++) {
    const col = shade(wood, woodShades[i % woodShades.length]);
    S.quad(
      deckPoint(path, i, -HALF_WIDTH, DECK_Y), deckPoint(path, i + 1, -HALF_WIDTH, DECK_Y),
      deckPoint(path, i + 1, HALF_WIDTH, DECK_Y), deckPoint(path, i, HALF_WIDTH, DECK_Y),
      col, [0, 1, 0],
    );
    for (const side of [-1, 1]) {
      const normal = [path[i].n[0] * side, 0, path[i].n[1] * side];
      S.quad(
        deckPoint(path, i, side * HALF_WIDTH, DECK_Y), deckPoint(path, i + 1, side * HALF_WIDTH, DECK_Y),
        deckPoint(path, i + 1, side * HALF_WIDTH, DECK_Y - FASCIA_DROP), deckPoint(path, i, side * HALF_WIDTH, DECK_Y - FASCIA_DROP),
        fascia, normal,
      );
    }
  }
  for (const [endIdx, dirSign] of [[0, -1], [path.length - 1, 1]]) {
    const normal = [path[endIdx].t[0] * dirSign, 0, path[endIdx].t[1] * dirSign];
    S.quad(
      deckPoint(path, endIdx, -HALF_WIDTH, DECK_Y), deckPoint(path, endIdx, HALF_WIDTH, DECK_Y),
      deckPoint(path, endIdx, HALF_WIDTH, DECK_Y - FASCIA_DROP), deckPoint(path, endIdx, -HALF_WIDTH, DECK_Y - FASCIA_DROP),
      fascia, normal,
    );
  }
}

function buildHandrails(S, path, isOpening) {
  const { bronze } = BOARDWALK_PAL;
  const railY = DECK_Y + RAIL_TOP_OFFSET;
  const railOff = HALF_WIDTH - RAIL_INSET;
  for (const side of [-1, 1]) {
    for (let i = 0; i < path.length; i += POST_EVERY_SAMPLES) {
      if (side < 0 && isOpening(i)) continue;
      const center = deckPoint(path, i, side * railOff, 0);
      const tan = path[i].t;
      const nrm = path[i].n;
      const halfSz = POST_HALF_SIZE;
      const p00 = [center[0] - tan[0] * halfSz - nrm[0] * halfSz, center[2] - tan[1] * halfSz - nrm[1] * halfSz];
      const p10 = [center[0] + tan[0] * halfSz - nrm[0] * halfSz, center[2] + tan[1] * halfSz - nrm[1] * halfSz];
      const p01 = [center[0] - tan[0] * halfSz + nrm[0] * halfSz, center[2] - tan[1] * halfSz + nrm[1] * halfSz];
      const p11 = [center[0] + tan[0] * halfSz + nrm[0] * halfSz, center[2] + tan[1] * halfSz + nrm[1] * halfSz];
      S.quad([p00[0], DECK_Y, p00[1]], [p10[0], DECK_Y, p10[1]], [p10[0], railY, p10[1]], [p00[0], railY, p00[1]], bronze, [-nrm[0], 0, -nrm[1]]);
      S.quad([p01[0], DECK_Y, p01[1]], [p11[0], DECK_Y, p11[1]], [p11[0], railY, p11[1]], [p01[0], railY, p01[1]], bronze, [nrm[0], 0, nrm[1]]);
    }
    for (let i = 0; i + 1 < path.length; i++) {
      if (side < 0 && [0, 1, 2, 3, 4].some((delta) => isOpening(i + delta))) continue;
      if (i % POST_EVERY_SAMPLES) continue;
      const nextIdx = Math.min(path.length - 1, i + POST_EVERY_SAMPLES);
      const innerOff = side * (railOff - 0.05);
      const outerOff = side * (railOff + 0.05);
      S.quad(
        deckPoint(path, i, innerOff, railY + RAIL_BAR_HEIGHT), deckPoint(path, nextIdx, innerOff, railY + RAIL_BAR_HEIGHT),
        deckPoint(path, nextIdx, outerOff, railY + RAIL_BAR_HEIGHT), deckPoint(path, i, outerOff, railY + RAIL_BAR_HEIGHT),
        bronze, [0, 1, 0],
      );
      for (const [edgeOff, normalSign] of [[innerOff, -side], [outerOff, side]]) {
        S.quad(
          deckPoint(path, i, edgeOff, railY), deckPoint(path, nextIdx, edgeOff, railY),
          deckPoint(path, nextIdx, edgeOff, railY + RAIL_BAR_HEIGHT), deckPoint(path, i, edgeOff, railY + RAIL_BAR_HEIGHT),
          bronze, [path[i].n[0] * normalSign, 0, path[i].n[1] * normalSign],
        );
      }
    }
  }
}

function buildPiles(S, path) {
  const { pile } = BOARDWALK_PAL;
  S.kind = KIND.MASONRY;
  for (let i = 2; i < path.length - 1; i += POST_EVERY_SAMPLES) {
    for (const side of [-1, 1]) {
      const center = deckPoint(path, i, side * (HALF_WIDTH - PILE_EDGE_INSET), 0);
      const tan = path[i].t;
      const nrm = path[i].n;
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([du, dv]) => [
        center[0] + tan[0] * PILE_HALF_SIZE * du + nrm[0] * PILE_HALF_SIZE * dv,
        center[2] + tan[1] * PILE_HALF_SIZE * du + nrm[1] * PILE_HALF_SIZE * dv,
      ]);
      for (let cornerIdx = 0; cornerIdx < 4; cornerIdx++) {
        const ptA = corners[cornerIdx];
        const ptB = corners[(cornerIdx + 1) % 4];
        const normal = [(ptA[0] + ptB[0]) / 2 - center[0], 0, (ptA[1] + ptB[1]) / 2 - center[2]];
        S.quad([ptA[0], PILE_Y, ptA[1]], [ptB[0], PILE_Y, ptB[1]], [ptB[0], DECK_Y - FASCIA_DROP, ptB[1]], [ptA[0], DECK_Y - FASCIA_DROP, ptA[1]], pile, normal);
      }
    }
  }
}

function buildStairs(S, path, stairAt, stairDir) {
  const { wood, woodShades, bronze } = BOARDWALK_PAL;
  S.kind = KIND.PLAIN;
  const stepRise = (LAND_Y - DECK_Y) / STAIR_STEPS;
  stairAt.forEach((sampleIdx, stairIdx) => {
    if (sampleIdx < 0 || sampleIdx >= path.length) return;
    const climbDir = stairDir[stairIdx];
    const innerOff = -(path[sampleIdx].bank + 0.6);
    const outerOff = -HALF_WIDTH;
    const stairWidth = Math.abs(innerOff - outerOff);
    const midOff = (innerOff + outerOff) / 2;
    const base = deckPoint(path, sampleIdx, midOff, 0);
    const tan = path[sampleIdx].t;
    const angle = Math.atan2(tan[1], tan[0]);
    S.box(base[0], base[2], DECK_Y - FASCIA_DROP, DECK_Y, STAIR_LANDING_LEN, stairWidth, angle, shade(wood, 0.9), { bottom: true });
    for (let step = 0; step < STAIR_STEPS; step++) {
      const along = climbDir * (STAIR_LANDING_LEN / 2 + STAIR_TREAD * (step + 0.5));
      const cx = base[0] + tan[0] * along;
      const cz = base[2] + tan[1] * along;
      S.box(cx, cz, DECK_Y - FASCIA_DROP + stepRise * step, DECK_Y + stepRise * (step + 1), STAIR_TREAD, stairWidth, angle, shade(wood, woodShades[step % 3]));
    }
    const outerPt = deckPoint(path, sampleIdx, outerOff - 0.1, 0);
    const totalRun = STAIR_LANDING_LEN / 2 + STAIR_TREAD * STAIR_STEPS;
    S.beam(
      [outerPt[0] + tan[0] * climbDir * (STAIR_LANDING_LEN / 2), DECK_Y + RAIL_TOP_OFFSET, outerPt[2] + tan[1] * climbDir * (STAIR_LANDING_LEN / 2)],
      [outerPt[0] + tan[0] * climbDir * totalRun, LAND_Y + RAIL_TOP_OFFSET, outerPt[2] + tan[1] * climbDir * totalRun],
      0.08, 0.08, bronze,
    );
  });
}

function buildBollards(S, path, group, glows) {
  const { bronze } = BOARDWALK_PAL;
  const pos = [];
  const cols = [];
  for (let i = 2, count = 0; i < path.length; i += POST_EVERY_SAMPLES, count++) {
    const side = count % 2 ? 1 : -1;
    const glowPt = deckPoint(path, i, side * (HALF_WIDTH - 0.3), DECK_Y + BOLLARD_HEIGHT);
    pos.push(glowPt[0], glowPt[1], glowPt[2]);
    const tint = 0.94 + 0.06 * ((count * 7) % 3) / 2;
    cols.push(1.0 * tint, 0.74 * tint, 0.4 * tint);
  }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < pos.length; i += 3) {
    S.box(pos[i], pos[i + 2], DECK_Y, DECK_Y + BOLLARD_POST_HEIGHT, BOLLARD_SIZE, BOLLARD_SIZE, 0, bronze);
  }
  const pts = glowPoints(pos, cols, 4);
  pts.userData.glow = true;
  group.add(pts);
  glows.push(pts);
}

export function buildBoardwalk(data, S, group) {
  const glows = [];
  if (replaced('golim')) return { glows }; // modelled in landmarks/places/golim.js
  try {
    const path = boardwalkPath(data);
    if (!path || path.length < MIN_PATH_SAMPLES) { console.warn('boardwalk: no bank found'); return { glows }; }
    S.base = 0;

    const totalLen = (path.length - 1) * SAMPLE_STEP;
    const stairAt = [8, totalLen / 2 - 40, totalLen - 8].map((dist) => Math.round(dist / SAMPLE_STEP));
    const stairDir = [-1, 1, 1];
    const isOpening = (idx) => stairAt.some((stairIdx) => Math.abs(idx - stairIdx) <= 1);

    buildDeck(S, path);
    buildHandrails(S, path, isOpening);
    buildPiles(S, path);
    buildStairs(S, path, stairAt, stairDir);
    buildBollards(S, path, group, glows);
  } catch (err) {
    console.warn('boardwalk:', err);
  } finally {
    S.kind = KIND.PLAIN;
    S.base = 0;
  }
  return { glows };
}
