import { KIND, hex, shade } from '../../geo/buf.ts';
import { LAND_Y } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';

// ---- Đàn Xã Tắc, the Nguyễn altar to the gods of Soil and Grain (1806), west of the Imperial City ----
//
// Sources (docs/places/xatac.md has the full list):
//  - vi.wikipedia.org/wiki/Đàn_Xã_Tắc_(Huế): two square open-air tiers; the lower about 73 m a side and 1.23 m high on
//    a brick base, the upper about 30 m a side and 1.6 m high on a laterite (đá gan gà) base; railings about 0.9 m,
//    red on the lower tier and yellow on the upper; four stairs in the middle of each side; a low wall round the
//    altar with gates on the north, east and west (none on the south). Restored from 2007, rites revived 2008.
//  - kienthuc.net.vn: the altar faces north; tiers 1.20 m and 1.6 m.
//  - OpenStreetMap: the upper tier as grassland (way 695810888, 30.4 m square), the walk round its foot (695810875),
//    the four upper stairs (695810876/77/78/79), the paved walks across the lower tier (695810884/85/86/87), the
//    restored lawn (695810866) and the Xã Tắc lane, which ends at the north gate and runs across the old south band.
// Google satellite and car Street View (2024-26, checked in the rebuild of this place): the upper tier sits where OSM
// puts it (within about 1 m, edges about 36 degrees off the grid). Today it is the only raised part: the lawn around it
// is flush with its foot and with the lanes, there is no 1.2 m lower tier, no red railing and no enclosing wall or gate
// posts. The upper tier's base reads as dark red-brown brick and its balustrade as weathered grey stone with openwork
// panels; the walks are grey stone. So the model draws today's site: one raised tier, the lower tier only as its flush
// lawn and the four grey walks out to its documented edges (73 m; the south walk stops at 27 m, as on the satellite).
// Estimated: step counts, balustrade detail, colours.

// the upper tier's OSM square, model metres; its first edge runs along the north (back) face
const TOP_RING = [[-1901.7, 424.0], [-1877.1, 406.1], [-1859.3, 430.1], [-1883.9, 448.1]];

const UPPER_H = 1.6; // upper tier height
const LOWER_HALF_W = 36.5;
const LOWER_Q0 = -36.5;
const LOWER_Q1 = 27; // lower tier (flush today): half-width across, north and south edges (q toward the south)
const UPPER_HALF = 15.2; // upper tier half-side
const WALK_W = 3.8; // walk and stair width
const FOOT_STRIP = 0.9; // the strip at the foot
const BATTER = 0.09; // the brick base leans in this much (m) from footing to cope

const COLORS = {
  lawn: hex('#8b9f5e'),
  lawnUpper: hex('#93a764'),
  brick: hex('#57453b'),
  cope: hex('#8f8a7e'),
  stone: hex('#a7a499'),
  pave: hex('#7f878f'),
  ring: hex('#6c7176'),
  step: hex('#a19d91'),
  dinh: hex('#9a978d'),
};

export const id = 'xatac';

// the altar's frame: a across (east-north-east), q toward the citadel's south (south-south-east); it faces -q (north)
const ORIGIN = TOP_RING.reduce((acc, pt) => [acc[0] + pt[0] / 4, acc[1] + pt[1] / 4], [0, 0]);
const EDGE_X = TOP_RING[1][0] - TOP_RING[0][0];
const EDGE_Z = TOP_RING[1][1] - TOP_RING[0][1];
const EDGE_LEN = Math.hypot(EDGE_X, EDGE_Z);
const AXIS_X = EDGE_X / EDGE_LEN;
const AXIS_Z = EDGE_Z / EDGE_LEN;
const ANGLE = Math.atan2(AXIS_Z, AXIS_X);
const toWorld = (a, q): [number, number] => [ORIGIN[0] + a * AXIS_X - q * AXIS_Z, ORIGIN[1] + a * AXIS_Z + q * AXIS_X];

// The lawn square and its walks are this file's own ground: the city draws none of its footways or lawn patches on
// it (OSM maps the walks as footways 695810875, 695810884-87 and paved areas, the lawn as 695810866) and plants no
// trees or houses there; the satellite and the car panos show bare lawn with the stone walks across it.
export function clearings() {
  return [[toWorld(-LOWER_HALF_W, LOWER_Q0), toWorld(LOWER_HALF_W, LOWER_Q0), toWorld(LOWER_HALF_W, LOWER_Q1), toWorld(-LOWER_HALF_W, LOWER_Q1)]];
}

// the stone incense burner (đỉnh) on the lawn north-west of the tier, 5.5 m south of the west car pano (refs2/sv-west-south):
// square, on four curled feet, two tall upright ears; width estimated from the pano at about 1 m
const DINH_POS = [-1916.6, 416.4];

const groundAt = (a, q) => {
  const pos = toWorld(a, q);
  return LAND_Y + rise(pos[0], pos[1]);
};

function placeBox(S, a, q, y0, y1, w, d, color, opt?) {
  const pos = toWorld(a, q);
  S.box(pos[0], pos[1], y0, y1, w, d, ANGLE, color, opt);
}

function placeSpan(S, a0, a1, q0, q1, y0, y1, color, opt?) {
  placeBox(S, (a0 + a1) / 2, (q0 + q1) / 2, y0, y1, a1 - a0, q1 - q0, color, opt);
}

// a flush patch over [a0,a1]x[q0,q1], in tiles that follow the ground
function buildFlushTiles(S, a0, a1, q0, q1, thickness, color, kind, opt?) {
  const na = Math.max(1, Math.round((a1 - a0) / 8));
  const nq = Math.max(1, Math.round((q1 - q0) / 8));
  const stepA = (a1 - a0) / na;
  const stepQ = (q1 - q0) / nq;
  for (let i = 0; i < na; i++) {
    for (let j = 0; j < nq; j++) {
      const tileA = a0 + stepA * (i + 0.5);
      const tileQ = q0 + stepQ * (j + 0.5);
      const y = groundAt(tileA, tileQ);
      S.kind = kind;
      placeBox(S, tileA, tileQ, y - 0.3, y + thickness, stepA + 0.01, stepQ + 0.01, color, opt);
    }
  }
}

function buildUpperTierBase(S, baseY, topY) {
  S.kind = KIND.MASONRY;
  const pavedStart = S.n;
  const footY = baseY - 0.4;
  placeSpan(S, -UPPER_HALF, UPPER_HALF, -UPPER_HALF, UPPER_HALF, footY, topY, COLORS.brick, { top: COLORS.lawnUpper, topKind: KIND.GROUND, taper: 1 - BATTER / UPPER_HALF });
  (S.paved = S.paved || []).push([pavedStart, S.n]); // its lawn is bare on the satellite: no trees, no houses (geo/city.js coverOf)
  const faceHalfAt = (y) => UPPER_HALF - (BATTER * (y - footY)) / (topY - footY); // the battered face's half-side at height y
  placeSpan(S, -faceHalfAt(topY) - 0.12, faceHalfAt(topY) + 0.12, -faceHalfAt(topY) - 0.12, faceHalfAt(topY) + 0.12, topY - 0.16, topY - 0.02, COLORS.cope);
  placeSpan(S, -UPPER_HALF - 0.12, UPPER_HALF + 0.12, -UPPER_HALF - 0.12, UPPER_HALF + 0.12, baseY - 0.2, baseY + 0.2, shade(COLORS.brick, 0.88)); // footing course

  // weathered brick: faint mortar-stained courses, a lighter band under the cope, and mottled patches
  for (const [frac, factor] of ([[0.35, 0.93], [0.7, 0.95]] as any[])) {
    const yy = baseY + (topY - baseY) * frac;
    const half = faceHalfAt(yy) + 0.02;
    placeSpan(S, -half, half, -half, half, yy, yy + 0.1, shade(COLORS.brick, factor));
  }
  {
    const half = faceHalfAt(topY - 0.2) + 0.03;
    placeSpan(S, -half, half, -half, half, topY - 0.4, topY - 0.2, shade(COLORS.brick, 1.06));
  }
  let seed = 7;
  const nextRand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 46; i++) {
      const along = -UPPER_HALF + 0.6 + nextRand() * (2 * UPPER_HALF - 1.2);
      const patchW = 0.5 + nextRand() * 1.6;
      const patchH = 0.15 + nextRand() * 0.4;
      const patchY = baseY + 0.2 + nextRand() * (topY - baseY - 0.7 - patchH);
      const dist = faceHalfAt(patchY + patchH) + 0.015;
      const tone = nextRand() < 0.5 ? 0.8 + nextRand() * 0.1 : 1.08 + nextRand() * 0.1;
      // side 0 north (-q), 1 south, 2 west (-a), 3 east
      const [a, q, sw, sd] = side < 2 ? [along, side ? dist : -dist, patchW, 0.04] : [side === 3 ? dist : -dist, along, 0.04, patchW];
      placeBox(S, a, q, patchY, patchY + patchH, sw, sd, shade(COLORS.brick, tone));
    }
  }
}

function buildWalksAndBalustrade(S, topY) {
  // ---- slate walks: a narrow dark strip at the tier's foot and the four blue-grey walks ----
  const pave = (a0, a1, q0, q1, color = COLORS.pave, thickness = 0.06) => buildFlushTiles(S, a0, a1, q0, q1, thickness, color, KIND.ROAD);
  pave(-UPPER_HALF - FOOT_STRIP, UPPER_HALF + FOOT_STRIP, -UPPER_HALF - FOOT_STRIP, -UPPER_HALF, COLORS.ring, 0.04);
  pave(-UPPER_HALF - FOOT_STRIP, UPPER_HALF + FOOT_STRIP, UPPER_HALF, UPPER_HALF + FOOT_STRIP, COLORS.ring, 0.04);
  pave(-UPPER_HALF - FOOT_STRIP, -UPPER_HALF, -UPPER_HALF, UPPER_HALF, COLORS.ring, 0.04);
  pave(UPPER_HALF, UPPER_HALF + FOOT_STRIP, -UPPER_HALF, UPPER_HALF, COLORS.ring, 0.04);
  pave(-WALK_W / 2 - 0.3, WALK_W / 2 + 0.3, LOWER_Q0, -UPPER_HALF - FOOT_STRIP);
  pave(-WALK_W / 2 - 0.3, WALK_W / 2 + 0.3, UPPER_HALF + FOOT_STRIP, LOWER_Q1);
  pave(-LOWER_HALF_W, -UPPER_HALF - FOOT_STRIP, -WALK_W / 2 - 0.3, WALK_W / 2 + 0.3);
  pave(UPPER_HALF + FOOT_STRIP, LOWER_HALF_W, -WALK_W / 2 - 0.3, WALK_W / 2 + 0.3);

  // ---- the balustrade: weathered grey stone, a plinth, square piers, openwork panels and a top rail, opened at the stairs ----
  const buildRailing = (a0, q0, a1, q1, y, color, gaps) => {
    const len = Math.hypot(a1 - a0, q1 - q0);
    const da = (a1 - a0) / len;
    const dq = (q1 - q0) / len;
    const alongA = Math.abs(da) > 0.5;
    const sizePair = (alongLen, thick): [number, number] => (alongA ? [alongLen, thick] : [thick, alongLen]);
    const segs = [];
    let cursor = 0;
    for (const [g0, g1] of gaps) {
      segs.push([cursor, g0]);
      cursor = g1;
    }
    segs.push([cursor, len]);
    S.kind = KIND.MASONRY;
    for (const [s0, s1] of segs) {
      if (s1 - s0 < 0.3) continue;
      const mid = (s0 + s1) / 2;
      const segLen = s1 - s0;
      const midA = a0 + da * mid;
      const midQ = q0 + dq * mid;
      placeBox(S, midA, midQ, y, y + 0.2, ...sizePair(segLen, 0.34), color);
      placeBox(S, midA, midQ, y + 0.7, y + 0.88, ...sizePair(segLen, 0.32), shade(color, 1.06));
      // openwork panels: a frame and a lattice of upright and cross bars, open between them
      const latticeCol = shade(color, 0.86);
      placeBox(S, midA, midQ, y + 0.2, y + 0.26, ...sizePair(segLen, 0.12), latticeCol);
      placeBox(S, midA, midQ, y + 0.44, y + 0.49, ...sizePair(segLen, 0.1), latticeCol);
      placeBox(S, midA, midQ, y + 0.64, y + 0.7, ...sizePair(segLen, 0.12), latticeCol);
      const bayCount = Math.max(1, Math.round(segLen / 1.8));
      for (let i = 0; i <= bayCount; i++) {
        const s = s0 + (segLen * i) / bayCount;
        placeBox(S, a0 + da * s, q0 + dq * s, y + 0.2, y + 0.94, 0.3, 0.3, color);
        if (i === bayCount) break;
        const bayLen = segLen / bayCount;
        const barCount = Math.max(2, Math.round(bayLen / 0.26));
        for (let j = 1; j < barCount; j++) {
          const barS = s + 0.15 + ((bayLen - 0.3) * j) / barCount;
          placeBox(S, a0 + da * barS, q0 + dq * barS, y + 0.26, y + 0.64, ...sizePair(0.06, 0.09), latticeCol);
        }
      }
    }
  };
  const midGap = (len) => [[len / 2 - WALK_W / 2 - 0.3, len / 2 + WALK_W / 2 + 0.3]];
  const inset = 0.2;
  const railLen = 2 * UPPER_HALF - 2 * inset;
  buildRailing(-UPPER_HALF + inset, -UPPER_HALF + inset, UPPER_HALF - inset, -UPPER_HALF + inset, topY, COLORS.stone, midGap(railLen));
  buildRailing(-UPPER_HALF + inset, UPPER_HALF - inset, UPPER_HALF - inset, UPPER_HALF - inset, topY, COLORS.stone, midGap(railLen));
  buildRailing(-UPPER_HALF + inset, -UPPER_HALF + inset, -UPPER_HALF + inset, UPPER_HALF - inset, topY, COLORS.stone, midGap(railLen));
  buildRailing(UPPER_HALF - inset, -UPPER_HALF + inset, UPPER_HALF - inset, UPPER_HALF - inset, topY, COLORS.stone, midGap(railLen));
}

function buildStairsAndIncenseBurner(S, baseY, topY) {
  // ---- stairs: a grey stone flight in the middle of each side, between low brick cheek walls ----
  const buildFlight = (a, q, da, dq, yBot, yTop, stepCount, run) => {
    const stepRise = (yTop - yBot) / stepCount;
    const tread = run / stepCount;
    const acrossA = Math.abs(da) > 0.5;
    S.kind = KIND.MASONRY;
    for (let i = 0; i < stepCount; i++) {
      const dist = run - tread * (i + 0.5);
      const w = acrossA ? tread : WALK_W;
      const d = acrossA ? WALK_W : tread;
      placeBox(S, a + da * dist, q + dq * dist, yBot - 0.3, yBot + stepRise * (i + 1), w, d, COLORS.step);
    }
    // cheek walls, sloped as a stack of short blocks
    for (const side of [-1, 1]) {
      const cheekA = acrossA ? 0 : side * (WALK_W / 2 + 0.25);
      const cheekQ = acrossA ? side * (WALK_W / 2 + 0.25) : 0;
      for (let i = 0; i < stepCount; i++) {
        const dist = run - tread * (i + 0.5);
        const w = acrossA ? tread + 0.02 : 0.5;
        const d = acrossA ? 0.5 : tread + 0.02;
        placeBox(S, a + da * dist + cheekA, q + dq * dist + cheekQ, yBot - 0.3, yBot + stepRise * (i + 1) + 0.2, w, d, COLORS.brick, { top: COLORS.cope });
      }
    }
  };
  buildFlight(0, -UPPER_HALF, 0, -1, baseY, topY, 7, 2.3);
  buildFlight(0, UPPER_HALF, 0, 1, baseY, topY, 7, 2.3);
  buildFlight(-UPPER_HALF, 0, -1, 0, baseY, topY, 7, 2.3);
  buildFlight(UPPER_HALF, 0, 1, 0, baseY, topY, 7, 2.3);

  // ---- the stone incense burner (đỉnh) on the lawn ----
  const [dx, dz] = DINH_POS;
  const burnerY = LAND_Y + rise(dx, dz);
  const cosA = Math.cos(ANGLE);
  const sinA = Math.sin(ANGLE);
  const burnerAt = (u, v): [number, number] => [dx + u * cosA - v * sinA, dz + u * sinA + v * cosA];
  const burnerBox = (u, v, y0, y1, w, d, color, opt?) => {
    const pos = burnerAt(u, v);
    S.box(pos[0], pos[1], y0, y1, w, d, ANGLE, color, opt);
  };
  S.kind = KIND.MASONRY;
  for (const [u, v] of ([[-0.38, -0.38], [0.38, -0.38], [0.38, 0.38], [-0.38, 0.38]] as any[])) {
    burnerBox(u, v, burnerY - 0.1, burnerY + 0.5, 0.16, 0.16, shade(COLORS.dinh, 0.9));
  }
  burnerBox(0, 0, burnerY + 0.4, burnerY + 0.5, 0.96, 0.96, shade(COLORS.dinh, 0.95)); // apron over the feet
  burnerBox(0, 0, burnerY + 0.5, burnerY + 1.25, 0.9, 0.9, COLORS.dinh, { taper: 1.1 });
  burnerBox(0, 0, burnerY + 1.25, burnerY + 1.33, 1.06, 1.06, shade(COLORS.dinh, 1.06), { top: shade(COLORS.dinh, 0.45) }); // the rim, dark ash inside
  for (const side of [-1, 1]) { // the two upright ears, leaning out a little at the top
    burnerBox(side * 0.42, 0, burnerY + 1.2, burnerY + 1.72, 0.1, 0.32, COLORS.dinh);
    burnerBox(side * 0.47, 0, burnerY + 1.62, burnerY + 1.78, 0.18, 0.36, shade(COLORS.dinh, 1.04));
  }
}

export function build({ S }) {
  let baseY = Infinity;
  for (let a = -UPPER_HALF; a <= UPPER_HALF; a += 5) {
    for (let q = -UPPER_HALF; q <= UPPER_HALF; q += 5) baseY = Math.min(baseY, groundAt(a, q));
  }
  const topY = baseY + UPPER_H;
  const savedKind = S.kind;

  // ---- the lower tier, flush with the ground today: a lawn square ----
  buildFlushTiles(S, -LOWER_HALF_W, LOWER_HALF_W, LOWER_Q0, LOWER_Q1, 0.03, COLORS.lawn, KIND.GROUND);

  buildUpperTierBase(S, baseY, topY);
  buildWalksAndBalustrade(S, topY);
  buildStairsAndIncenseBurner(S, baseY, topY);

  S.kind = savedKind;
}
