import { KIND, hex, shade, mix, unflat, obb, inRing } from '../geo/buf.ts';
import { LAND_Y, roadWidth } from '../config.ts';
import { rise, waterY } from '../geo/terrain.ts';
import { glowPoints } from '../geo/materials.ts';
import {
  add3, scl3, lin3, hash, catmull, fin, sweep, buildDragonAquarium,
} from './thuytien-dragon.ts';

// Hồ Thủy Tiên — the water park that opened in 2004 and was left to the pines.
//
// Mapped (OSM): the dragon aquarium's round footprint and the three footbridges that meet at it, the grandstand
// of the lakeside amphitheatre and its show pool, the slide pools and the slide tower, the two entrance plazas and
// their sculptures, the entrance, the lake itself.

const DARK_OPENING = hex('#2b2422');
const RINGED_PLAZAS = new Set(['493380761']);
const ENTRY_BANDS = [0, 0.08, 0.14, 0.26, 0.38, 0.5, 0.62, 0.71, 0.8, 0.9, 1];
const LAZY_RIVER_CTRL = [
  [-1404.4, 6640], [-1404.2, 6634], [-1403.4, 6615], [-1402.5, 6602.5],
  [-1399.4, 6595.6], [-1391.5, 6590.3], [-1381, 6587.3], [-1372.5, 6589], [-1367, 6592],
];
const RIVER_HW = 1.6;
const RIVER_WALL = 0.3;
const LAKE_LAMP_STEP = 26;

const groundY = (x, z) => LAND_Y + rise(x, z);

const centroid = (ring) => {
  let sx = 0, sz = 0, twiceArea = 0;
  for (let i = 0, count = ring.length; i < count; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % count];
    const cross = ptA[0] * ptB[1] - ptB[0] * ptA[1];
    twiceArea += cross;
    sx += (ptA[0] + ptB[0]) * cross;
    sz += (ptA[1] + ptB[1]) * cross;
  }
  return twiceArea ? [sx / (3 * twiceArea), sz / (3 * twiceArea)] : ring[0];
};
const scaled = (ring, center, factor) => ring.map((pt) => [center[0] + (pt[0] - center[0]) * factor, center[1] + (pt[1] - center[1]) * factor]);

const chaikin = (ring, passes = 2) => {
  let cur = ring;
  for (let pass = 0; pass < passes; pass++) {
    const next = [];
    for (let i = 0; i < cur.length; i++) {
      const ptA = cur[i], ptB = cur[(i + 1) % cur.length];
      next.push([ptA[0] * 0.75 + ptB[0] * 0.25, ptA[1] * 0.75 + ptB[1] * 0.25], [ptA[0] * 0.25 + ptB[0] * 0.75, ptA[1] * 0.25 + ptB[1] * 0.75]);
    }
    cur = next;
  }
  return cur;
};

const areaOf = (ring) => {
  let acc = 0;
  for (let i = 0, count = ring.length; i < count; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % count];
    acc += ptA[0] * ptB[1] - ptB[0] * ptA[1];
  }
  return acc / 2;
};

function offsetRing(ring, dist) {
  const count = ring.length, sign = areaOf(ring) > 0 ? 1 : -1;
  const edgeNormal = (ptA, ptB) => {
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) || 1;
    return [sign * (ptB[1] - ptA[1]) / len, -sign * (ptB[0] - ptA[0]) / len];
  };
  return ring.map((pt, idx) => {
    const n1 = edgeNormal(ring[(idx - 1 + count) % count], pt);
    const n2 = edgeNormal(pt, ring[(idx + 1) % count]);
    const bis = [n1[0] + n2[0], n1[1] + n2[1]];
    const bisLen = Math.hypot(bis[0], bis[1]) || 1;
    const miter = dist / Math.max(0.6, (bis[0] * n1[0] + bis[1] * n1[1]) / bisLen);
    return [pt[0] + (bis[0] / bisLen) * miter, pt[1] + (bis[1] / bisLen) * miter];
  });
}

function distLine(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const ptA = pts[i], ptB = pts[i + 1];
    const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], lenSq = dx * dx + dz * dz || 1;
    const param = Math.max(0, Math.min(1, ((x - ptA[0]) * dx + (z - ptA[1]) * dz) / lenSq));
    best = Math.min(best, Math.hypot(x - ptA[0] - dx * param, z - ptA[1] - dz * param));
  }
  return best;
}

const curve = (ctrl, step = 1) => catmull(ctrl.map((pt) => [pt[0], 0, pt[1]]), step).map((pt) => [pt[0], pt[2]]);

const frameAt = (pts, idx) => {
  const ptA = pts[Math.max(0, idx - 1)], ptB = pts[Math.min(pts.length - 1, idx + 1)];
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]) || 1;
  const tan = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
  return { t: tan, n: [-tan[1], tan[0]] };
};

function ribbon(S, pts, width, lift, col) {
  S.kind = KIND.ROAD;
  const edges = pts.map((pt, idx) => {
    const { n } = frameAt(pts, idx);
    return [[pt[0] + n[0] * width / 2, pt[1] + n[1] * width / 2], [pt[0] - n[0] * width / 2, pt[1] - n[1] * width / 2]];
  });
  const liftPt = (pt) => [pt[0], groundY(pt[0], pt[1]) + lift, pt[1]];
  for (let i = 0; i + 1 < pts.length; i++) {
    S.quad(liftPt(edges[i][1]), liftPt(edges[i][0]), liftPt(edges[i + 1][0]), liftPt(edges[i + 1][1]), shade(col, i % 2 ? 0.96 : 1.03), [0, 1, 0]);
  }
  S.kind = KIND.PLAIN;
}

// ------------------------------------------------------------------ palms and garden trees
function royalPalm(S, x, z, height, seed) {
  const baseY = groundY(x, z);
  const trunkCol = hex('#9b988e'), ringCol = hex('#bdb8aa'), shaftCol = hex('#6c8748');
  const leafCols = [hex('#4f7c38'), hex('#5d8b40'), hex('#43692f')];
  S.kind = KIND.PLAIN;
  S.cyl(x, z, baseY - 0.3, baseY + 0.9, 0.52, 0.36, 6, shade(trunkCol, 0.9), { cap: false });
  S.cyl(x, z, baseY + 0.9, baseY + height - 1.7, 0.36, 0.26, 6, trunkCol, { cap: false });
  for (let y = baseY + 2.0; y < baseY + height - 2.4; y += 1.9) {
    const ringR = 0.36 - 0.1 * ((y - baseY) / height) + 0.035;
    S.cyl(x, z, y, y + 0.16, ringR, ringR, 6, ringCol, { cap: false });
  }
  S.cyl(x, z, baseY + height - 1.7, baseY + height, 0.33, 0.2, 6, shaftCol);
  const crown = [x, baseY + height - 0.1, z];
  const frondCount = 9;
  for (let k = 0; k < frondCount; k++) {
    const ang = hash(seed) * 6.28 + (k / frondCount) * Math.PI * 2 + (hash(seed + k) - 0.5) * 0.4;
    const droop = 0.3 + 0.7 * hash(seed * 3 + k);
    const dir = [Math.cos(ang), 0, Math.sin(ang)], side = [-Math.sin(ang), 0, Math.cos(ang)];
    const mid = lin3([crown, 1], [dir, 2.0], [[0, 1, 0], 0.9 - droop * 0.5]);
    const tip = lin3([crown, 1], [dir, 3.9 - droop * 0.5], [[0, 1, 0], -0.6 - droop * 1.3]);
    const col = leafCols[k % 3];
    fin(S, add3(crown, scl3(side, 0.14)), add3(mid, scl3(side, 0.62)), add3(mid, scl3(side, -0.62)), col);
    fin(S, add3(mid, scl3(side, 0.62)), tip, add3(mid, scl3(side, -0.62)), shade(col, 0.92));
  }
  fin(S, add3(crown, [0.12, 0, 0]), add3(crown, [-0.12, 0, 0]), add3(crown, [0, 1.6, 0]), leafCols[1]);
}

function fanPalm(S, x, z, seed) {
  const baseY = groundY(x, z);
  const baseCol = [hex('#55803c'), hex('#4a7236'), hex('#678f45')][Math.floor(hash(seed + 1) * 3)];
  S.kind = KIND.PLAIN;
  const stemCount = 2 + Math.floor(hash(seed + 7) * 2);
  for (let j = 0; j < stemCount; j++) {
    const stemAng = hash(seed + j * 3) * 6.28;
    const stemOff = j ? 0.35 + 0.3 * hash(seed + j) : 0;
    const stemH = 0.8 + hash(seed + j * 5) * 1.4;
    const bx = x + Math.cos(stemAng) * stemOff, bz = z + Math.sin(stemAng) * stemOff;
    S.cyl(bx, bz, baseY - 0.2, baseY + stemH, 0.13, 0.1, 5, hex('#6c5e47'), { cap: false });
    const crown = [bx, baseY + stemH, bz];
    for (let k = 0; k < 6; k++) {
      const ang = stemAng + (k / 6) * Math.PI * 2 + hash(seed * 3 + k);
      const dir = [Math.cos(ang), 0, Math.sin(ang)], side = [-Math.sin(ang), 0, Math.cos(ang)];
      const reach = 0.9 + 0.5 * hash(seed + k + j);
      const stalk = lin3([crown, 1], [dir, reach * 0.6], [[0, 1, 0], 0.5 + 0.3 * hash(k + seed)]);
      const tip = lin3([stalk, 1], [dir, reach * 0.75], [[0, 1, 0], 0.15]);
      S.beam(crown, stalk, 0.04, 0.04, hex('#6f7a43'));
      const col = shade(baseCol, 0.88 + 0.18 * hash(seed * 5 + k + j));
      fin(S, stalk, add3(tip, scl3(side, 0.55)), add3(tip, scl3(side, -0.55)), col);
      fin(S, add3(tip, scl3(side, 0.55)), add3(tip, scl3(side, -0.55)), lin3([tip, 1], [dir, 0.25], [[0, 1, 0], -0.2]), shade(col, 0.9));
    }
  }
}

function gardenTree(S, x, z, seed) {
  const baseY = groundY(x, z);
  const height = 4.6 + hash(seed) * 1.8, radius = 1.8 + hash(seed + 3) * 0.8;
  const col = shade(hex('#4f6f3a'), 0.9 + 0.2 * hash(seed + 7));
  S.kind = KIND.PLAIN;
  S.cyl(x, z, baseY - 0.2, baseY + height * 0.5, 0.18, 0.14, 5, hex('#5d4a37'), { cap: false });
  S.cyl(x, z, baseY + height * 0.38, baseY + height * 0.7, radius * 0.7, radius, 7, shade(col, 0.9), { cap: false });
  S.cyl(x, z, baseY + height * 0.7, baseY + height, radius, radius * 0.3, 7, col);
}

// ------------------------------------------------------------------ the footbridges to the dragon
function footbridge(S, from, to) {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  let len = Math.hypot(dx, dz);
  if (len < 4) return;
  const dir = [dx / len, dz / len], across = [-dir[1], dir[0]];
  const ang = Math.atan2(dir[1], dir[0]);
  const deckY = waterY(from[0], from[1]) - 0.08 + 0.5;
  const deckW = 3.0;
  for (let dist = 4; dist < len; dist += 0.5) {
    if ([-deckW / 2, 0, deckW / 2].some((off) => groundY(from[0] + dir[0] * dist + across[0] * off, from[1] + dir[1] * dist + across[1] * off) >= deckY - 0.1)) {
      len = dist;
      break;
    }
  }
  const deckPt = (along, off, dy = 0) => [from[0] + dir[0] * along + across[0] * off, deckY + dy, from[1] + dir[1] * along + across[1] * off];
  const mid = deckPt(len / 2, 0);
  S.base = deckY - LAND_Y;
  S.kind = KIND.ROAD;
  S.box(mid[0], mid[2], deckY - 0.35, deckY, len, deckW, ang, hex('#b3b0a2'), { bottom: true });
  S.kind = KIND.MASONRY;
  const bays = Math.max(1, Math.round(len / 8));
  for (let i = 0; i <= bays; i++) {
    const pierPt = deckPt((len * i) / bays, 0);
    S.box(pierPt[0], pierPt[2], deckY - 3.6, deckY - 0.35, 0.7, deckW - 0.5, ang, hex('#8f9186'));
    S.box(pierPt[0], pierPt[2], deckY - 0.6, deckY - 0.35, 1.1, deckW + 0.3, ang, hex('#a09f93'));
  }
  S.kind = KIND.PLAIN;
  const railCol = hex('#9fb0b3'), postCol = hex('#8b9a9c');
  for (const side of [-1, 1]) {
    const off = side * (deckW / 2 - 0.1);
    S.beam(deckPt(0, off, 1.05), deckPt(len, off, 1.05), 0.09, 0.09, railCol);
    S.beam(deckPt(0, off, 0.55), deckPt(len, off, 0.55), 0.06, 0.06, railCol);
    const posts = Math.max(2, Math.round(len / 2.2));
    for (let i = 0; i <= posts; i++) S.beam(deckPt((len * i) / posts, off, 0), deckPt((len * i) / posts, off, 1.05), 0.08, 0.08, postCol);
  }
  for (let i = 1; i < bays; i += 2) {
    const side = i % 4 === 1 ? 1 : -1;
    const lampBase = deckPt((len * i) / bays, side * (deckW / 2 + 0.05));
    S.beam(lampBase, [lampBase[0], deckY + 4.2, lampBase[2]], 0.12, 0.12, postCol);
    S.beam([lampBase[0], deckY + 4.2, lampBase[2]], [lampBase[0] - across[0] * side * 0.9, deckY + 4.5, lampBase[2] - across[1] * side * 0.9], 0.1, 0.1, postCol);
    S.box(lampBase[0] - across[0] * side * 1.0, lampBase[2] - across[1] * side * 1.0, deckY + 4.3, deckY + 4.55, 0.5, 0.3, ang, hex('#d8d6c8'));
  }
}

// ------------------------------------------------------------------ pools, plazas, sculptures, cleared ground
function pool(S, rawRing, apronWidthFn = null) {
  const ring = chaikin(rawRing, 2);
  let hi = -Infinity, lo = Infinity;
  for (const pt of ring) {
    const y = groundY(pt[0], pt[1]);
    hi = Math.max(hi, y); lo = Math.min(lo, y);
  }
  S.base = 0;
  S.kind = KIND.PLAIN;
  const topY = Math.min(hi, lo + 1.0);
  const inner = offsetRing(ring, -0.6);
  S.prism(ring, lo - 0.4, topY + 0.45, hex('#4f93b0'), hex('#8cc3d2'), { holes: [inner.slice().reverse()] });
  S.prism(inner, lo - 0.4, topY + 0.2, hex('#3f7f8c'), hex('#4f8f84'));
  if (!apronWidthFn) return ring;
  const widths = ring.map((pt) => apronWidthFn(pt[0], pt[1]));
  const outer = ring.map((_, idx) => offsetRing(ring, widths[idx])[idx]);
  const sand = hex('#cdc2a2');
  const liftPt = (pt) => [pt[0], groundY(pt[0], pt[1]) + 0.32, pt[1]];
  S.kind = KIND.ROAD;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    S.quad(liftPt(ring[i]), liftPt(outer[i]), liftPt(outer[j]), liftPt(ring[j]), shade(sand, i % 2 ? 0.97 : 1.02), [0, 1, 0]);
  }
  S.kind = KIND.PLAIN;
  return outer;
}

function entrancePlaza(S, ring) {
  const center = centroid(ring), lift = 0.3, subdiv = 3;
  const border = [];
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length];
    for (let k = 0; k < subdiv; k++) border.push([ptA[0] + (ptB[0] - ptA[0]) * (k / subdiv), ptA[1] + (ptB[1] - ptA[1]) * (k / subdiv)]);
  }
  const ringVert = (idx, frac) => {
    const pt = border[idx % border.length];
    const x = center[0] + (pt[0] - center[0]) * frac, z = center[1] + (pt[1] - center[1]) * frac;
    return [x, groundY(x, z) + lift, z];
  };
  const terra = hex('#a58f7e'), grass = hex('#76894f'), roadCol = hex('#7f7d74');
  for (let i = 0; i < border.length; i++) {
    for (let band = 0; band + 1 < ENTRY_BANDS.length; band++) {
      const f0 = ENTRY_BANDS[band], f1 = ENTRY_BANDS[band + 1], mid = (f0 + f1) / 2;
      const [col, kind] = mid < 0.14
        ? [grass, KIND.GROUND]
        : mid < 0.62
          ? [shade(terra, (i + band) % 2 ? 0.95 : 1.03), KIND.ROAD]
          : mid < 0.8
            ? [shade(grass, i % 2 ? 1 : 0.95), KIND.GROUND]
            : [shade(roadCol, i % 2 ? 0.98 : 1.02), KIND.ROAD];
      S.kind = kind;
      if (f0 === 0) S.tri(ringVert(i, 0), ringVert(i, f1), ringVert(i + 1, f1), col, [0, 1, 0]);
      else S.quad(ringVert(i, f0), ringVert(i, f1), ringVert(i + 1, f1), ringVert(i + 1, f0), col, [0, 1, 0]);
    }
    const ptA = border[i], ptB = border[(i + 1) % border.length];
    S.kind = KIND.ROAD;
    S.quad([ptA[0], groundY(ptA[0], ptA[1]) - 0.3, ptA[1]], [ptB[0], groundY(ptB[0], ptB[1]) - 0.3, ptB[1]], ringVert(i + 1, 1), ringVert(i, 1), hex('#9c998c'), [ptA[0] - center[0], 0.2, ptA[1] - center[1]]);
  }
  const centerY = groundY(center[0], center[1]);
  S.kind = KIND.MASONRY;
  S.prism(scaled(border, center, 0.14), centerY - 0.3, centerY + lift + 0.35, hex('#a8a598'), hex('#6c8550'));
  S.kind = KIND.PLAIN;
  for (let k = 0; k < 3; k++) {
    const ang = k * 2.1 + 0.4;
    gardenTree(S, center[0] + Math.cos(ang) * 1.6, center[1] + Math.sin(ang) * 1.6, 40 + k);
  }
  for (let i = 0; i < border.length; i += 6) {
    const pt = ringVert(i + 3, 0.71);
    gardenTree(S, pt[0], pt[2], 50 + i);
  }
  const timber = hex('#5f4631');
  for (let i = 0; i < border.length; i += 2) {
    const pt = ringVert(i, 0.6);
    S.box(pt[0], pt[2], pt[1] - 0.4, pt[1] + 0.75, 0.2, 0.2, 0, timber, { top: shade(timber, 0.8) });
  }
}

function plaza(S, ring, ringed = false) {
  if (!ringed) { entrancePlaza(S, ring); return; }
  const center = centroid(ring), lift = 0.24;
  const paveCol = hex('#bdb8a8'), grass = hex('#7d8d5c');
  const liftPt = (pt) => [pt[0], groundY(pt[0], pt[1]) + lift, pt[1]];
  const pavedBands = [[1, 0.84], [0.7, 0.55], [0.42, 0.28]];
  const isPaved = (frac) => pavedBands.some(([hi, lo]) => frac <= hi && frac > lo);
  const cuts = [1, 0.84, 0.7, 0.55, 0.42, 0.28, 0];

  S.kind = KIND.ROAD;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    for (let band = 0; band < cuts.length - 1; band++) {
      const f0 = cuts[band], f1 = cuts[band + 1], pave = isPaved((f0 + f1) / 2);
      const outer = scaled(ring, center, f0), inner = scaled(ring, center, f1);
      S.kind = pave ? KIND.ROAD : KIND.GROUND;
      if (f1 === 0) S.tri(liftPt(center), liftPt(outer[i]), liftPt(outer[j]), pave ? paveCol : grass, [0, 1, 0]);
      else S.quad(liftPt(inner[i]), liftPt(outer[i]), liftPt(outer[j]), liftPt(inner[j]), pave ? (i % 2 ? paveCol : shade(paveCol, 0.95)) : shade(grass, i % 2 ? 1 : 0.95), [0, 1, 0]);
    }
    S.kind = KIND.ROAD;
    S.quad([ring[i][0], groundY(ring[i][0], ring[i][1]) - 0.3, ring[i][1]], [ring[j][0], groundY(ring[j][0], ring[j][1]) - 0.3, ring[j][1]], liftPt(ring[j]), liftPt(ring[i]), hex('#9c998c'), [ring[i][0] - center[0], 0.2, ring[i][1] - center[1]]);
  }
  S.kind = KIND.PLAIN;
}

function cleared(S, ring) {
  const center = centroid(ring), lift = 0.12, sand = hex('#c9b48e');
  const liftPt = (pt) => [pt[0], groundY(pt[0], pt[1]) + lift, pt[1]];
  S.kind = KIND.GROUND;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    S.tri(liftPt(center), liftPt(ring[i]), liftPt(ring[j]), shade(sand, 0.94 + 0.08 * hash(i)), [0, 1, 0]);
  }
  S.kind = KIND.ROAD;
  const box = obb(ring);
  for (let k = 0; k < 4; k++) {
    const u = (hash(k * 7 + ring.length) - 0.5) * box.w * 0.6;
    const v = (hash(k * 13 + 3) - 0.5) * box.d * 0.6;
    const x = box.c[0] + Math.cos(box.a) * u - Math.sin(box.a) * v;
    const z = box.c[1] + Math.sin(box.a) * u + Math.cos(box.a) * v;
    if (!inRing(x, z, ring)) continue;
    const baseY = groundY(x, z);
    S.box(x, z, baseY - 0.2, baseY + lift + 0.06, 3 + hash(k) * 4, 2 + hash(k + 1) * 3, box.a, hex('#a7a59c'));
  }
  S.kind = KIND.PLAIN;
}

function sculpture(S, x, z, seed) {
  const baseY = groundY(x, z), stone = hex('#c9c3b2'), ang = hash(seed) * 3;
  S.kind = KIND.MASONRY;
  S.box(x, z, baseY - 0.2, baseY + 0.45, 1.9, 1.9, ang, hex('#a9a69a'));
  S.kind = KIND.PLAIN;
  const variant = Math.floor(hash(seed + 5) * 3), y0 = baseY + 0.45;
  if (variant === 0) {
    S.cyl(x, z, y0, y0 + 0.8, 0.7, 0.85, 8, stone, { cap: false });
    S.cyl(x, z, y0 + 0.8, y0 + 1.5, 0.85, 0.3, 8, shade(stone, 0.95));
  } else if (variant === 1) {
    S.beam([x - Math.cos(ang) * 0.75, y0 + 0.3, z - Math.sin(ang) * 0.75], [x + Math.cos(ang) * 0.65, y0 + 1.3, z + Math.sin(ang) * 0.65], 1.0, 0.36, stone);
  } else {
    S.cyl(x - 0.35, z, y0, y0 + 1.1, 0.5, 0.32, 7, stone);
    S.cyl(x + 0.45, z + 0.2, y0, y0 + 0.7, 0.42, 0.28, 7, shade(stone, 0.93));
  }
}

// ------------------------------------------------------------------ the slide tower and the aqua park
function buildSlideRoof(S, toLocal, ux, uz, hw, hd, deckY, timber) {
  const yEave = deckY + 2.7, yRidge = deckY + 4.3;
  const ru = hw + 1.0, rv = hd + 1.0, along = ru >= rv;
  const ridgeU = along ? ru - rv : 0, ridgeV = along ? 0 : rv - ru;
  for (const [u, v] of [[-hw - 0.3, -hd - 0.3], [hw + 0.3, -hd - 0.3], [hw + 0.3, hd + 0.3], [-hw - 0.3, hd + 0.3], [0, -hd - 0.3], [0, hd + 0.3]]) {
    const [x, z] = toLocal(u, v);
    S.beam([x, deckY, z], [x, yEave, z], 0.2, 0.2, timber);
  }
  for (const u of [-hw - 0.3, 0, hw + 0.3]) {
    const ptA = toLocal(u, -rv + 0.2), ptB = toLocal(u, rv - 0.2);
    const ridgePt = toLocal(Math.max(-ridgeU, Math.min(ridgeU, u)), 0);
    S.beam([ptA[0], yEave - 0.1, ptA[1]], [ptB[0], yEave - 0.1, ptB[1]], 0.18, 0.22, timber);
    S.beam([ptA[0], yEave - 0.1, ptA[1]], [ridgePt[0], yRidge - 0.15, ridgePt[1]], 0.14, 0.18, timber);
    S.beam([ptB[0], yEave - 0.1, ptB[1]], [ridgePt[0], yRidge - 0.15, ridgePt[1]], 0.14, 0.18, timber);
    S.beam([ridgePt[0], yEave - 0.1, ridgePt[1]], [ridgePt[0], yRidge - 0.15, ridgePt[1]], 0.14, 0.14, timber);
  }
  const pt3 = (u, v, y) => { const [x, z] = toLocal(u, v); return [x, y, z]; };
  const sheet = hex('#8d9590'), rust = hex('#8a6a52');
  const buildSlope = (e0, e1, r1, r0, strips, hint) => {
    const lerp3 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
    for (let i = 0; i < strips; i++) {
      const t0 = i / strips, t1 = (i + 1) / strips;
      const col = shade(mix(sheet, rust, 0.15 + 0.25 * hash(i * 3 + strips)), i % 2 ? 0.9 : 1.04);
      S.quad(lerp3(e0, e1, t0), lerp3(e0, e1, t1), lerp3(r0, r1, t1), lerp3(r0, r1, t0), col, hint);
      S.quad(lerp3(e0, e1, t0), lerp3(e0, e1, t1), lerp3(r0, r1, t1), lerp3(r0, r1, t0), shade(col, 0.6), scl3(hint, -1));
    }
  };
  S.kind = KIND.PLAIN;
  const eavePts = [pt3(-ru, -rv, yEave), pt3(ru, -rv, yEave), pt3(ru, rv, yEave), pt3(-ru, rv, yEave)];
  const ridgePts = [pt3(-ridgeU, -ridgeV, yRidge), pt3(ridgeU, -ridgeV, yRidge), pt3(ridgeU, ridgeV, yRidge), pt3(-ridgeU, ridgeV, yRidge)];
  const slopeHint = (dir) => [ux * dir[0] - uz * dir[1], 1.4, uz * dir[0] + ux * dir[1]];
  buildSlope(eavePts[0], eavePts[1], ridgePts[1], ridgePts[0], 14, slopeHint([0, -1]));
  buildSlope(eavePts[2], eavePts[3], ridgePts[3], ridgePts[2], 14, slopeHint([0, 1]));
  buildSlope(eavePts[1], eavePts[2], ridgePts[2], ridgePts[1], 8, slopeHint([1, 0]));
  buildSlope(eavePts[3], eavePts[0], ridgePts[0], ridgePts[3], 8, slopeHint([-1, 0]));
}

function buildSlideTube(S, center, toLocal, ux, uz, fu, fv, eu, ev, baseY, deckY, bigRing, poolCenter, conc) {
  let bestDot = -Infinity, poolEdge = null;
  for (const pt of bigRing) {
    const score = (pt[0] - poolCenter[0]) * (center[0] - poolCenter[0]) + (pt[1] - poolCenter[1]) * (center[1] - poolCenter[1]);
    if (score > bestDot) { bestDot = score; poolEdge = pt; }
  }
  const outDir = [ux * fu - uz * fv, uz * fu + ux * fv];
  const helixR = 3.4;
  const mouth = toLocal(fu * eu, fv * ev);
  const helixCenter = [mouth[0] + outDir[0] * helixR, mouth[1] + outDir[1] * helixR];
  const distToPool = Math.hypot(poolEdge[0] - center[0], poolEdge[1] - center[1]) || 1;
  const toPool = [(poolEdge[0] - center[0]) / distToPool, (poolEdge[1] - center[1]) / distToPool];
  const housePt = [poolEdge[0] - toPool[0] * 2.2, poolEdge[1] - toPool[1] * 2.2];

  const startTheta = Math.atan2(mouth[1] - helixCenter[1], mouth[0] - helixCenter[0]);
  const exitTheta = Math.atan2(toPool[1], toPool[0]) - Math.PI / 2;
  const sweepAng = (((exitTheta - startTheta) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2;
  const tube = [], helixEndY = baseY + 3.6, helixSteps = Math.round(sweepAng / 0.18);
  for (let k = 0; k <= helixSteps; k++) {
    const frac = k / helixSteps, theta = startTheta + sweepAng * frac;
    tube.push([helixCenter[0] + Math.cos(theta) * helixR, deckY + 0.35 + (helixEndY - deckY - 0.35) * frac, helixCenter[1] + Math.sin(theta) * helixR]);
  }
  const helixTail = tube[tube.length - 1];
  const runDist = Math.hypot(housePt[0] - helixTail[0], housePt[1] - helixTail[2]);
  const houseY = groundY(housePt[0], housePt[1]) + 1.1;
  for (let dist = 1; dist <= runDist; dist += 1) {
    const frac = dist / runDist;
    tube.push([helixTail[0] + (housePt[0] - helixTail[0]) * frac, helixEndY + (houseY - helixEndY) * frac, helixTail[2] + (housePt[1] - helixTail[2]) * frac]);
  }
  sweep(S, tube, tube.map(() => 0.62), tube.map(() => [0, 1, 0]), 8, (idx) => [idx % 6 < 3 ? hex('#3f6a4f') : hex('#355d44'), KIND.PLAIN]);
  for (let k = 4; k < tube.length; k += 5) {
    const pt = tube[k];
    if (pt[1] - groundY(pt[0], pt[2]) > 1.4) S.cyl(pt[0], pt[2], groundY(pt[0], pt[2]) - 0.3, pt[1] - 0.55, 0.16, 0.16, 5, hex('#8b8d83'), { cap: false });
  }
  S.cyl(helixCenter[0], helixCenter[1], groundY(helixCenter[0], helixCenter[1]) - 0.3, deckY + 0.2, 0.3, 0.3, 6, conc, { cap: false });

  const landY = groundY(housePt[0], housePt[1]), landAng = Math.atan2(toPool[1], toPool[0]);
  S.kind = KIND.MASONRY;
  S.box(housePt[0], housePt[1], landY - 0.3, landY + 2.4, 3.0, 2.6, landAng, hex('#c7c0ab'), { top: hex('#5f7d64'), topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  S.box(housePt[0] - toPool[0] * 1.52, housePt[1] - toPool[1] * 1.52, landY + 0.3, landY + 1.9, 0.08, 1.4, landAng, DARK_OPENING);
}

function slides(S, tower, bigRing) {
  const box = obb(tower), center = box.c;
  let baseY = Infinity;
  for (const pt of tower) baseY = Math.min(baseY, groundY(pt[0], pt[1]));
  const ux = Math.cos(box.a), uz = Math.sin(box.a);
  const toLocal = (u, v) => [center[0] + ux * u - uz * v, center[1] + uz * u + ux * v];
  const hw = Math.max(box.w, 7) / 2, hd = Math.max(box.d, 5.5) / 2, deckY = baseY + 9.6;
  const bark = hex('#7a6651'), timber = hex('#6e4e33'), terra = hex('#b0603f'), conc = hex('#9d978a'), tile = hex('#3f8fa0');
  S.base = baseY - LAND_Y;

  const poolCenter = centroid(bigRing);
  const toPoolVec = [poolCenter[0] - center[0], poolCenter[1] - center[1]];
  const [fu, fv] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([su, sv]) => [su, sv, (ux * su - uz * sv) * toPoolVec[0] + (uz * su + ux * sv) * toPoolVec[1]])
    .sort((faceA, faceB) => faceB[2] - faceA[2])[0];

  S.kind = KIND.MASONRY;
  S.box(center[0], center[1], baseY - 0.4, baseY + 3.0, hw * 1.3, hd * 1.2, box.a, hex('#c3bba6'), { top: hex('#8a8574'), topKind: KIND.FLAT });
  S.kind = KIND.PLAIN;
  for (const u of [-hw + 0.6, 0, hw - 0.6]) {
    for (const v of [-hd + 0.6, hd - 0.6]) {
      const [x, z] = toLocal(u, v);
      S.cyl(x, z, baseY - 0.3, baseY + 0.7, 0.85, 0.5, 8, shade(bark, 0.9), { cap: false });
      S.cyl(x, z, baseY + 0.7, deckY - 0.35, 0.5, 0.38, 8, bark, { cap: false });
      for (const sgn of [-1, 1]) {
        const [bx, bz] = toLocal(u + sgn * 1.1, v + (v > 0 ? -0.5 : 0.5));
        S.beam([x, deckY - 2.6, z], [bx, deckY - 0.3, bz], 0.32, 0.32, shade(bark, 0.95));
      }
    }
  }
  S.box(center[0], center[1], deckY - 0.4, deckY, hw * 2 + 1.2, hd * 2 + 1.2, box.a, conc, { top: terra, topKind: KIND.ROAD, bottom: true });

  const eu = hw + 0.5, ev = hd + 0.5;
  const corners = [[-eu, -ev], [eu, -ev], [eu, ev], [-eu, ev]];
  for (let k = 0; k < 4; k++) {
    const cA = corners[k], cB = corners[(k + 1) % 4], mid = [(cA[0] + cB[0]) / 2, (cA[1] + cB[1]) / 2];
    const isPoolFace = (fu && Math.sign(mid[0]) === fu && Math.abs(mid[0]) > eu - 0.1) || (fv && Math.sign(mid[1]) === fv && Math.abs(mid[1]) > ev - 0.1);
    const segs = Math.max(2, Math.round(Math.hypot(cB[0] - cA[0], cB[1] - cA[1]) / 1.4));
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs;
      if (isPoolFace && t0 > 0.3 && t1 < 0.71) continue;
      const p0 = toLocal(cA[0] + (cB[0] - cA[0]) * t0, cA[1] + (cB[1] - cA[1]) * t0);
      const p1 = toLocal(cA[0] + (cB[0] - cA[0]) * t1, cA[1] + (cB[1] - cA[1]) * t1);
      S.beam([p0[0], deckY + 1.05, p0[1]], [p1[0], deckY + 1.05, p1[1]], 0.12, 0.1, timber);
      S.beam([p0[0], deckY + 0.5, p0[1]], [p1[0], deckY + 0.5, p1[1]], 0.08, 0.08, timber);
      S.beam([p0[0], deckY, p0[1]], [p0[0], deckY + 1.1, p0[1]], 0.12, 0.12, shade(timber, 0.9));
    }
  }
  buildSlideRoof(S, toLocal, ux, uz, hw, hd, deckY, timber);

  const [bx, bz] = toLocal(fu * (hw - 1.6), fv * (hd - 1.6));
  S.box(bx, bz, deckY, deckY + 0.7, 3.0, 2.4, box.a, tile, { top: hex('#5fb3c2') });
  const [tx, tz] = toLocal(fu * (hw - 1.6) - (fv ? 2.2 : 0), fv * (hd - 1.6) - (fu ? 2.0 : 0));
  S.cyl(tx, tz, deckY, deckY + 0.9, 1.2, 1.2, 12, hex('#4a9fb4'), { cap: false });
  S.cyl(tx, tz, deckY + 0.7, deckY + 0.72, 1.12, 1.12, 12, hex('#6cc0cc'));

  const stairDir = fu ? [0, 1] : [1, 0], stairOut = fu ? [-fu, 0] : [0, -fv];
  const stairPt = (along, off) => toLocal(stairDir[0] * along + stairOut[0] * off, stairDir[1] * along + stairOut[1] * off);
  const stairWorldDir = [ux * stairDir[0] - uz * stairDir[1], uz * stairDir[0] + ux * stairDir[1]];
  const stairAng = Math.atan2(stairWorldDir[1], stairWorldDir[0]);
  const offBase = (fu ? eu : ev) + 0.8, run = (fu ? hd : hw) - 0.3;
  for (let flight = 0; flight < 2; flight++) {
    const off = offBase + flight * 1.4;
    const y0 = baseY + (flight * (deckY - baseY)) / 2, y1 = baseY + ((flight + 1) * (deckY - baseY)) / 2;
    const a0 = flight ? run : -run, a1 = -a0;
    for (let k = 0; k < 14; k++) {
      const frac = (k + 0.5) / 14, [x, z] = stairPt(a0 + (a1 - a0) * frac, off), y = y0 + (y1 - y0) * frac;
      S.box(x, z, y - 0.18, y, 0.45, 1.2, stairAng, hex('#8f8a7e'));
    }
    for (const railOff of [off - 0.65, off + 0.65]) {
      const p0 = stairPt(a0, railOff), p1 = stairPt(a1, railOff);
      S.beam([p0[0], y0 + 1.0, p0[1]], [p1[0], y1 + 1.0, p1[1]], 0.08, 0.08, timber);
    }
    const [px, pz] = stairPt(a1, off);
    S.cyl(px, pz, baseY - 0.2, y1, 0.2, 0.2, 6, conc, { cap: false });
  }
  buildSlideTube(S, center, toLocal, ux, uz, fu, fv, eu, ev, baseY, deckY, bigRing, poolCenter, conc);
  S.base = 0;
}

// ------------------------------------------------------------------ the lazy river and its palm garden
function lazyRiver(S, pts) {
  const blue = hex('#4b97b5'), pale = hex('#d6d0bf'), waterCol = hex('#4f9fa4');
  const frames = pts.map((pt, idx) => ({ p: pt, n: frameAt(pts, idx).n, g: groundY(pt[0], pt[1]) }));
  const ptAt = (idx, off, dy) => { const { p, n, g } = frames[idx]; return [p[0] + n[0] * off, g + dy, p[1] + n[1] * off]; };
  const outerW = RIVER_HW + RIVER_WALL;
  for (let i = 0; i + 1 < pts.length; i++) {
    const j = i + 1;
    S.kind = KIND.PLAIN;
    S.quad(ptAt(i, -RIVER_HW, 0.35), ptAt(i, RIVER_HW, 0.35), ptAt(j, RIVER_HW, 0.35), ptAt(j, -RIVER_HW, 0.35), shade(waterCol, i % 2 ? 0.97 : 1.02), [0, 1, 0]);
    for (const side of [-1, 1]) {
      const hint = [frames[i].n[0] * -side, 0, frames[i].n[1] * -side];
      S.quad(ptAt(i, side * RIVER_HW, 0.3), ptAt(j, side * RIVER_HW, 0.3), ptAt(j, side * RIVER_HW, 0.78), ptAt(i, side * RIVER_HW, 0.78), blue, hint);
      S.kind = KIND.MASONRY;
      S.quad(ptAt(i, side * RIVER_HW, 0.78), ptAt(j, side * RIVER_HW, 0.78), ptAt(j, side * outerW, 0.78), ptAt(i, side * outerW, 0.78), pale, [0, 1, 0]);
      S.quad(ptAt(i, side * outerW, -0.25), ptAt(j, side * outerW, -0.25), ptAt(j, side * outerW, 0.78), ptAt(i, side * outerW, 0.78), shade(pale, 0.88), scl3(hint, -1));
    }
  }
  for (const endIdx of [0, pts.length - 1]) {
    S.kind = KIND.MASONRY;
    const tan = frameAt(pts, endIdx).t, dirSign = endIdx ? 1 : -1;
    S.quad(ptAt(endIdx, -outerW, -0.25), ptAt(endIdx, outerW, -0.25), ptAt(endIdx, outerW, 0.78), ptAt(endIdx, -outerW, 0.78), pale, [tan[0] * dirSign, 0, tan[1] * dirSign]);
  }
  S.kind = KIND.PLAIN;
}

function riverBridge(S, pts, idx) {
  const pt = pts[idx], { n, t } = frameAt(pts, idx);
  const span = 3.8, timber = hex('#7b5a3a'), baseY = groundY(pt[0], pt[1]);
  const archPt = (across, along, dy) => {
    const x = pt[0] + n[0] * across + t[0] * along, z = pt[1] + n[1] * across + t[1] * along;
    return [x, Math.max(groundY(x, z), baseY) + 0.38 + 0.75 * Math.cos((across / span) * Math.PI / 2) + dy, z];
  };
  S.kind = KIND.PLAIN;
  const segs = 8;
  for (let k = 0; k < segs; k++) {
    const s0 = -span + (2 * span * k) / segs, s1 = -span + (2 * span * (k + 1)) / segs;
    S.beam(archPt(s0, 0, 0), archPt(s1, 0, 0), 1.9, 0.14, k % 2 ? timber : shade(timber, 1.06));
    for (const sideOff of [-0.9, 0.9]) {
      S.beam(archPt(s0, sideOff, 0.95), archPt(s1, sideOff, 0.95), 0.1, 0.1, shade(timber, 0.85));
      S.beam(archPt(s0, sideOff, 0), archPt(s0, sideOff, 0.95), 0.1, 0.1, shade(timber, 0.8));
    }
  }
  for (const sideOff of [-0.9, 0.9]) S.beam(archPt(span, sideOff, 0), archPt(span, sideOff, 0.95), 0.1, 0.1, shade(timber, 0.8));
}

const aquariumOf = (items) => items.find((item) => item.k === 'b' && /dragon|aquarium/i.test(item.n || ''));
const aquariumDisc = (aq) => {
  const center = centroid(aq.pts);
  const radius = Math.max(9, aq.pts.reduce((sum, pt) => sum + Math.hypot(pt[0] - center[0], pt[1] - center[1]), 0) / aq.pts.length);
  return { center, radius };
};

function aquariumBridges(roads, center, radius) {
  const out = [];
  for (const road of roads || []) {
    if (!Array.isArray(road) || !road[1]) continue;
    const flat = road[2];
    if (!Array.isArray(flat) || flat.length < 4) continue;
    const ends = [[flat[0] / 10, flat[1] / 10], [flat[flat.length - 2] / 10, flat[flat.length - 1] / 10]];
    const dists = ends.map((end) => Math.hypot(end[0] - center[0], end[1] - center[1]));
    if (Math.min(dists[0], dists[1]) < radius + 14) out.push({ flat, ends, dists });
  }
  return out;
}

export function thuyTienBridgeRoads(data) {
  const site = data && data.sites && data.sites.thuytien;
  const aq = site && aquariumOf((site.items || []).map((item) => ({ ...item, pts: unflat(item.ring) })));
  if (!aq) return new Set();
  const { center, radius } = aquariumDisc(aq);
  return new Set(aquariumBridges(data.roads, center, radius).map((bridge) => bridge.flat));
}

function walkRing(ring, step, fn) {
  let carry = 0;
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    for (let cursor = carry; cursor < len; cursor += step) {
      fn(ptA[0] + ((ptB[0] - ptA[0]) * cursor) / len, ptA[1] + ((ptB[1] - ptA[1]) * cursor) / len);
      carry = cursor + step - len;
    }
    if (carry >= len) carry -= len;
  }
}

function buildAquaPark(S, data, items, waters, wet, runPart) {
  const poolRings = items.filter((item) => item.k === 'p').map((item) => item.pts).sort((a, b) => b.length - a.length);
  const bigPool = poolRings[0];
  const river = curve(LAZY_RIVER_CTRL, 1);
  const riverDist = (x, z) => distLine(x, z, river);

  const grandstand = items.find((item) => item.k === 's');
  const grandCenter = grandstand ? centroid(grandstand.pts) : null;
  const nearPark = (pt) => (Math.abs(pt[0] + 1384) < 70 && Math.abs(pt[1] - 6612) < 70)
    || (grandCenter && Math.hypot(pt[0] - grandCenter[0], pt[1] - grandCenter[1]) < 110);
  const roadSegs = (data.roads || [])
    .filter((entry) => Array.isArray(entry) && Array.isArray(entry[2]))
    .map((entry) => ({ pts: unflat(entry[2]), w: roadWidth(entry) }))
    .filter((road) => road.pts.some(nearPark));
  const onRoad = (x, z, margin) => roadSegs.some((road) => distLine(x, z, road.pts) < road.w / 2 + margin);

  let bigOut = null;
  for (const ring of poolRings) {
    runPart(() => {
      const out = pool(S, ring, ring === bigPool ? (x, z) => Math.max(0.4, Math.min(3.2, riverDist(x, z) - RIVER_HW - RIVER_WALL - 0.4)) : null);
      if (ring === bigPool) bigOut = out;
    });
  }
  const smallKeep = poolRings.slice(1).map((ring) => offsetRing(chaikin(ring, 2), 0.4));
  const bigKeep = bigOut ? offsetRing(bigOut, 0.2) : bigPool ? offsetRing(chaikin(bigPool, 2), 0.6) : null;

  const poolCenter = bigPool ? centroid(bigPool) : LAZY_RIVER_CTRL[4];
  const midIdx = river.length >> 1, midFrame = frameAt(river, midIdx);
  const outerSign = (river[midIdx][0] + midFrame.n[0] - poolCenter[0]) ** 2 + (river[midIdx][1] + midFrame.n[1] - poolCenter[1]) ** 2
    > (river[midIdx][0] - poolCenter[0]) ** 2 + (river[midIdx][1] - poolCenter[1]) ** 2 ? 1 : -1;
  const pathOut = river.map((pt, idx) => {
    const { n } = frameAt(river, idx);
    return [pt[0] + n[0] * outerSign * 3.6, pt[1] + n[1] * outerSign * 3.6];
  });
  const pathSouth = curve([[-1408, 6643], [-1404.5, 6639.6], [-1390, 6637.8], [-1377, 6637.6], [-1372, 6641], [-1371.6, 6650], [-1371.6, 6656]], 1);
  const paths = [pathOut, pathSouth];

  if (bigPool) runPart(() => {
    lazyRiver(S, river);
    let bridgeIdx = 0, bestDist = Infinity;
    river.forEach((pt, idx) => { const dist = Math.abs(pt[1] - 6612); if (dist < bestDist) { bestDist = dist; bridgeIdx = idx; } });
    riverBridge(S, river, bridgeIdx);
    const terra = hex('#a5664e');
    ribbon(S, pathOut, 2.0, 0.36, terra);
    ribbon(S, pathSouth, 2.0, 0.36, terra);
  });

  const inZone = (x, z) => x > -1418 && x < -1350 && z > 6574 && z < 6652;
  const clearOf = (x, z, margin) => !wet(x, z) && !onRoad(x, z, margin)
    && riverDist(x, z) > RIVER_HW + RIVER_WALL + margin
    && !(bigKeep && inRing(x, z, bigKeep))
    && !smallKeep.some((ring) => inRing(x, z, ring))
    && !paths.some((path) => distLine(x, z, path) < 1.0 + margin);

  if (bigPool) runPart(() => {
    const startIdx = S.n, cellStep = 2, grass = hex('#6f8148'), earth = hex('#9a8964');
    S.kind = KIND.GROUND;
    const groundPt = (x, z) => [x, groundY(x, z) + 0.28, z];
    const bigNear = bigOut ? offsetRing(bigOut, 8) : null;
    const smallNear = smallKeep.map((ring) => offsetRing(ring, 6));
    const inGarden = (x, z) => riverDist(x, z) < 12 || distLine(x, z, pathSouth) < 6 || (bigNear && inRing(x, z, bigNear)) || smallNear.some((ring) => inRing(x, z, ring));
    for (let x = -1418; x < -1350; x += cellStep) {
      for (let z = 6574; z < 6652; z += cellStep) {
        const cx = x + cellStep / 2, cz = z + cellStep / 2;
        if (!inGarden(cx, cz) || !clearOf(cx, cz, 0.2) || [[x, z], [x + cellStep, z], [x, z + cellStep], [x + cellStep, z + cellStep]].some(([px, pz]) => wet(px, pz))) continue;
        const patch = 0.5 + 0.28 * Math.sin(cx * 0.19 + cz * 0.04) + 0.22 * Math.sin(cz * 0.15 - cx * 0.07);
        const col = shade(mix(grass, earth, 0.08 + 0.3 * patch * patch), 0.98 + 0.04 * hash(cx + cz * 3));
        S.quad(groundPt(x, z), groundPt(x + cellStep, z), groundPt(x + cellStep, z + cellStep), groundPt(x, z + cellStep), col, [0, 1, 0]);
      }
    }
    S.kind = KIND.PLAIN;
    (S.paved = S.paved || []).push([startIdx, S.n]);
  });

  if (bigPool) runPart(() => {
    let seed = 11;
    const planted = [];
    const plantPalm = (x, z, margin = 0.7) => {
      if (!inZone(x, z) || !clearOf(x, z, margin) || planted.some((pt) => Math.hypot(pt[0] - x, pt[1] - z) < 2.6)) return;
      planted.push([x, z]);
      royalPalm(S, x, z, 14 + hash(seed) * 4, seed++);
    };
    river.forEach((pt, idx) => {
      if (idx % 5) return;
      const { n } = frameAt(river, idx);
      for (const off of [5.6, 8.8, -2.9]) {
        const jitter = (hash(idx + off) - 0.5) * 0.8;
        plantPalm(pt[0] + n[0] * outerSign * off + jitter, pt[1] + n[1] * outerSign * off - jitter, off < 0 ? 0.3 : 0.7);
      }
    });
    if (bigOut) walkRing(offsetRing(bigOut, 1.4), 5.2, (x, z) => plantPalm(x, z));
    for (const ring of smallKeep) walkRing(offsetRing(ring, 1.6), 5, (x, z) => plantPalm(x, z));
    pathSouth.forEach((pt, idx) => {
      if (idx % 6) return;
      const { n } = frameAt(pathSouth, idx);
      for (const off of [-2.3, 2.3]) plantPalm(pt[0] + n[0] * off, pt[1] + n[1] * off);
    });
    const lake = waters.slice().sort((a, b) => b.length - a.length)[0];
    if (lake) alongShore(lake, 6, wet, inZone, (x, z, normal) => {
      plantPalm(x + normal[0] * 2.6, z + normal[1] * 2.6);
      plantPalm(x + normal[0] * 6.4, z + normal[1] * 6.4);
    });
    for (let x = -1417; x < -1351; x += 3) {
      for (let z = 6575; z < 6651; z += 3) {
        const roll = hash(x * 3.7 + z * 1.3);
        if (roll > 0.42) continue;
        const fx = x + roll * 4, fz = z + hash(roll * 99) * 2.5;
        if (!clearOf(fx, fz, 0.4) || planted.some((pt) => Math.hypot(pt[0] - fx, pt[1] - fz) < 1.0)) continue;
        fanPalm(S, fx, fz, Math.floor(roll * 1000));
      }
    }
  });

  if (grandCenter) runPart(() => {
    const lake = waters.slice().sort((a, b) => b.length - a.length)[0];
    if (!lake) return;
    let seed = 301;
    const planted = [];
    const canPlant = (x, z) => !wet(x, z) && !onRoad(x, z, 0.8) && !planted.some((pt) => Math.hypot(pt[0] - x, pt[1] - z) < 2.6);
    alongShore(lake, 6.5, wet, (x, z) => Math.hypot(x - grandCenter[0], z - grandCenter[1]) < 80, (x, z, normal) => {
      for (const dist of [2.8, 7.2]) {
        const px = x + normal[0] * dist, pz = z + normal[1] * dist;
        if (canPlant(px, pz)) { planted.push([px, pz]); royalPalm(S, px, pz, 13 + hash(seed) * 4, seed++); }
      }
    });
  });

  return bigPool;
}

export function buildThuyTien(data, S, group) {
  const site = data.sites && data.sites.thuytien;
  if (!site) return;
  const items = (site.items || []).map((item) => ({ ...item, pts: unflat(item.ring) }));
  const waters = items.filter((item) => item.k === 'w').map((item) => item.pts);
  const wet = (x, z) => waters.some((ring) => inRing(x, z, ring));
  const used = new Set();
  const runPart = (fn) => {
    try { fn(); } catch (err) { console.warn('thuy tien:', err); }
    S.kind = KIND.PLAIN;
    S.base = 0;
  };

  // the dragon aquarium and its three footbridges
  const aq = aquariumOf(items);
  if (aq) runPart(() => {
    used.add(aq.id);
    const { center, radius } = aquariumDisc(aq);
    const headDir = [Math.sin(-7 * Math.PI / 180), -Math.cos(-7 * Math.PI / 180)];
    const bridgeAngles = [];
    for (const { ends, dists } of aquariumBridges(data.roads, center, radius)) {
      const farEnd = dists[0] > dists[1] ? ends[0] : ends[1];
      const ang = Math.atan2(farEnd[1] - center[1], farEnd[0] - center[0]);
      bridgeAngles.push(ang);
      footbridge(S, [center[0] + Math.cos(ang) * (radius + 4.2), center[1] + Math.sin(ang) * (radius + 4.2)], [farEnd[0] + Math.cos(ang) * 1.5, farEnd[1] + Math.sin(ang) * 1.5]);
      S.kind = KIND.PLAIN;
    }
    buildDragonAquarium(S, center, radius, headDir, bridgeAngles);
  });

  // cleared amphitheatre site
  for (const item of items.filter((entry) => entry.k === 's')) runPart(() => {
    const center = centroid(item.pts);
    const showPools = waters.filter((ring) => { const pt = centroid(ring); return Math.hypot(pt[0] - center[0], pt[1] - center[1]) < 90; });
    const startIdx = S.n;
    for (const ring of [item.pts, ...showPools]) cleared(S, ring);
    (S.paved = S.paved || []).push([startIdx, S.n]);
  });

  // paved island under the dragon
  if (aq) runPart(() => {
    const { center } = aquariumDisc(aq);
    const landingY = waterY(center[0], center[1]) - 0.08 + 0.46;
    for (const poly of data.ponds || []) {
      for (let j = 1; j < poly.length; j++) {
        const hole = unflat(poly[j]);
        if (hole.length < 3 || !inRing(center[0], center[1], hole)) continue;
        let lo = Infinity, hi = -Infinity;
        for (const pt of hole) { lo = Math.min(lo, groundY(pt[0], pt[1])); hi = Math.max(hi, groundY(pt[0], pt[1])); }
        S.base = 0;
        S.kind = KIND.MASONRY;
        S.prism(hole, Math.min(lo, landingY) - 1.2, Math.max(landingY - 0.12, hi + 0.08), hex('#8f8d82'), hex('#a9a69a'), { topKind: KIND.ROAD });
      }
    }
  });

  const bigPool = buildAquaPark(S, data, items, waters, wet, runPart);

  for (const item of items.filter((entry) => entry.k === 'q')) runPart(() => {
    const startIdx = S.n;
    plaza(S, item.pts, RINGED_PLAZAS.has(String(item.id)));
    (S.paved = S.paved || []).push([startIdx, S.n]);
  });
  (site.points || []).forEach((pt, idx) => runPart(() => {
    if (pt.k === 'art') sculpture(S, pt.x / 10, pt.z / 10, idx * 7 + 3);
  }));

  const slidePt = (site.points || []).find((pt) => pt.k === 'slide');
  if (slidePt && bigPool) runPart(() => {
    const target = [slidePt.x / 10, slidePt.z / 10];
    const tower = items
      .filter((item) => item.k === 'b' && !used.has(item.id))
      .map((item) => { const center = centroid(item.pts); return { item, dist: Math.hypot(center[0] - target[0], center[1] - target[1]) }; })
      .sort((a, b) => a.dist - b.dist)[0];
    if (!tower || tower.dist > 60) return;
    used.add(tower.item.id);
    slides(S, tower.item.pts, chaikin(bigPool, 2));
  });

  const sim = items.find((item) => /space|simulator/i.test(item.n || ''));
  if (sim) runPart(() => {
    used.add(sim.id);
    const center = centroid(sim.pts);
    const radius = Math.max(3.5, sim.pts.reduce((sum, pt) => sum + Math.hypot(pt[0] - center[0], pt[1] - center[1]), 0) / sim.pts.length);
    const baseY = groundY(center[0], center[1]);
    S.kind = KIND.MASONRY;
    S.cyl(center[0], center[1], baseY - 0.4, baseY + 1.8, radius, radius, 12, hex('#a9a99f'), { cap: false });
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * (Math.PI / 2), a1 = ((k + 1) / 4) * (Math.PI / 2);
      S.cyl(center[0], center[1], baseY + 1.8 + Math.sin(a0) * radius * 0.9, baseY + 1.8 + Math.sin(a1) * radius * 0.9, radius * Math.cos(a0), Math.max(0.05, radius * Math.cos(a1)), 12, shade(hex('#c4c3b8'), 1 - k * 0.05), { cap: false });
    }
    S.box(center[0] + radius, center[1], baseY, baseY + 2.2, 0.2, 1.6, 0, DARK_OPENING);
  });

  for (const item of items) {
    if (item.k !== 'b' || used.has(item.id)) continue;
    runPart(() => {
      const box = obb(item.pts);
      if (box.w < 1 || box.d < 0.6) return;
      let lo = Infinity, hi = -Infinity;
      for (const pt of item.pts) { lo = Math.min(lo, groundY(pt[0], pt[1])); hi = Math.max(hi, groundY(pt[0], pt[1])); }
      const height = box.w * box.d > 200 ? 6.4 : 3.2;
      const wallCol = mix(hex('#9a9c92'), hex('#6d7465'), hash(+item.id % 997) * 0.6);
      S.base = hi - LAND_Y;
      S.kind = KIND.MASONRY;
      S.box(box.c[0], box.c[1], lo - 0.3, hi + height, box.w, box.d, box.a, wallCol, { top: hex('#6f7566'), topKind: KIND.FLAT });
      S.kind = KIND.PLAIN;
      const ux = Math.cos(box.a), uz = Math.sin(box.a), winCount = Math.max(1, Math.floor(box.w / 3.2));
      for (const side of [-1, 1]) {
        for (let i = 0; i < winCount; i++) {
          const offset = (i + 0.5 - winCount / 2) * (box.w / winCount);
          S.box(box.c[0] + ux * offset - uz * side * (box.d / 2 + 0.04), box.c[1] + uz * offset + ux * side * (box.d / 2 + 0.04), hi + 0.9, hi + Math.min(height - 0.5, 2.3), 1.1, 0.1, box.a, DARK_OPENING);
        }
      }
    });
  }

  const lake = waters.slice().sort((a, b) => b.length - a.length)[0];
  if (lake && group) runPart(() => {
    const plazaZones = items.filter((item) => item.k === 'q').map((item) => scaled(item.pts, centroid(item.pts), 1.15));
    const lampPos = lakeLamps(S, lake, wet, (x, z) => plazaZones.some((ring) => inRing(x, z, ring)));
    if (!lampPos.length) return;
    const pts = glowPoints(lampPos, lampPos.map((_, idx) => [0.86, 0.93, 1][idx % 3]), 4);
    pts.userData.glow = true;
    pts.userData.landmark = 'thuytien';
    group.add(pts);
  });
}

function alongShore(ring, step, wet, keep, fn) {
  const signedArea = areaOf(ring);
  let carry = step / 2;
  for (let i = 0, count = ring.length; i < count; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % count];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (len < 0.01) continue;
    const dir = [(ptB[0] - ptA[0]) / len, (ptB[1] - ptA[1]) / len];
    const normal = signedArea > 0 ? [-dir[1], dir[0]] : [dir[1], -dir[0]];
    for (let cursor = carry; cursor < len; cursor += step) {
      carry = cursor + step - len;
      const bx = ptA[0] + dir[0] * cursor, bz = ptA[1] + dir[1] * cursor;
      if (!keep(bx, bz)) continue;
      const side = [1, -1].find((sgn) => !wet(bx + normal[0] * sgn * 3.5, bz + normal[1] * sgn * 3.5) && !wet(bx + normal[0] * sgn * 5.5, bz + normal[1] * sgn * 5.5));
      if (side) fn(bx, bz, [normal[0] * side, normal[1] * side], dir);
    }
    if (carry >= len) carry -= len;
  }
}

function lakeLamps(S, ring, wet, skip) {
  const out = [], postCol = hex('#5d6466'), headCol = hex('#d9dcd8');
  alongShore(ring, LAKE_LAMP_STEP, wet, () => true, (bx, bz, normal, dir) => {
    const x = bx + normal[0] * 3.5, z = bz + normal[1] * 3.5;
    if (skip(x, z)) return;
    const baseY = groundY(x, z);
    S.kind = KIND.PLAIN;
    S.cyl(x, z, baseY - 0.2, baseY + 4.2, 0.09, 0.07, 5, postCol, { cap: false });
    S.box(x, z, baseY + 4.2, baseY + 4.45, 0.5, 0.5, Math.atan2(dir[1], dir[0]), headCol);
    out.push(x, baseY + 4.1, z);
  });
  return out;
}
