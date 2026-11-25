// Shared architectural primitives for the Nguyễn royal tombs south-west of the city:
// terraces, halls, flights of steps, dragon balustrades, walls, gates, arched bridges,
// stone statues, and obelisks.
import { KIND, hex, shade } from '../geo/buf.ts';
import { LAND_Y, POND_Y, PAL } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { pavilion } from './citadel.ts';
import * as Props from './props.ts';

const TOMB_COL = {
  brick: hex('#6e6253'), brickMoss: hex('#5e6249'), brickWarm: hex('#8a5c46'),
  stone: PAL.stone, stoneGrey: hex('#9b978d'), stoneDark: hex('#7c786f'), stucco: hex('#ddd3bc'),
  lacquer: hex('#86362a'), lacquerOld: hex('#6f3c30'),
  roofY: PAL.imperialRoof, roofYOld: hex('#b48b3e'), roofG: PAL.jadeRoof, roofTile: hex('#7a6552'),
  door: hex('#2b2422'), iron: hex('#262423'), bronze: hex('#4a3a26'),
  // Khải Định: concrete weathered grey-black by the rain, darker roofs of ardoise slate, paler cornices and trim
  kdWall: hex('#5e5c59'), kdRoof: hex('#474543'), kdTrim: hex('#a9a59c'),
  moss: PAL.moss, pine: hex('#3d5734'),
};
const RIDGE_COL = hex('#e9d27e');
const MANDARIN_COL = hex('#a29d92');

const GROUND_SAMPLE_STEP = 5;
const GROUND_SAMPLE_MAX = 30;
const TERRACE_FOOT_DEPTH = 1;
const MIN_TERRACE_THICK = 0.3;
const DEFAULT_PAV_WALL_H = 3.6;
const MIN_ROOF_H = 1.5;
const MAX_ROOF_H = 3.8;
const STEP_MAX_RISE = 0.42;
const STEP_MIN_TREAD = 0.28;
const MAX_STEPS = 32;
const BRIDGE_MIN_SEGS = 4;
const BRIDGE_MAX_SEGS = 12;

// ---------- small geometry helpers ----------
const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));
const gY = (x, z) => LAND_Y + rise(x, z);

// sample points over an oriented rectangle (corners, edge mids, centre)
function rectPts(cx, cz, width, depth, angle) {
  const ux = Math.cos(angle), uz = Math.sin(angle);
  const out = [];
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) {
      out.push([cx + (ux * i * width) / 2 - (uz * j * depth) / 2, cz + (uz * i * width) / 2 + (ux * j * depth) / 2]);
    }
  }
  return out;
}

// Lowest and highest ground under a footprint: the points given and the whole box round them, every few metres.
function groundSpan(pts) {
  let lo = Infinity, hi = -Infinity;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const take = (x, z) => { const y = gY(x, z); lo = Math.min(lo, y); hi = Math.max(hi, y); };
  for (const pt of pts) {
    take(pt[0], pt[1]);
    x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]);
    z0 = Math.min(z0, pt[1]); z1 = Math.max(z1, pt[1]);
  }
  if (lo === Infinity) return { lo: LAND_Y, hi: LAND_Y };
  const nx = Math.min(GROUND_SAMPLE_MAX, Math.ceil((x1 - x0) / GROUND_SAMPLE_STEP));
  const nz = Math.min(GROUND_SAMPLE_MAX, Math.ceil((z1 - z0) / GROUND_SAMPLE_STEP));
  for (let i = 1; i < nx; i++) {
    for (let j = 1; j < nz; j++) {
      take(x0 + ((x1 - x0) * i) / nx, z0 + ((z1 - z0) * j) / nz);
    }
  }
  return { lo, hi };
}

// ---------- building blocks ----------
// a level platform from 1 m below the lowest ground under it up to `top`
function terrace(S, cx, cz, width, depth, angle, top, col = TOMB_COL.stone) {
  const { lo } = groundSpan(rectPts(cx, cz, width, depth, angle));
  const baseY = lo - TERRACE_FOOT_DEPTH;
  if (top < baseY + MIN_TERRACE_THICK) top = baseY + MIN_TERRACE_THICK;
  S.kind = KIND.MASONRY;
  S.base = baseY - LAND_Y;
  S.box(cx, cz, baseY, top, width, depth, angle, col, { top: shade(col, 1.06), topKind: KIND.ROAD });
  return top;
}

const levelTop = (cx, cz, width, depth, angle, lift = 0.2) => groundSpan(rectPts(cx, cz, width, depth, angle)).hi + lift;

// pavilion() wants the long side along the angle. `h` is the height of the ridge over the floor, where known.
function pav(S, cx, cz, width, depth, angle, floor, { h = null, ...opts }: Record<string, any> = {}) {
  if (width < depth) { [width, depth] = [depth, width]; angle += Math.PI / 2; }
  const wallH = opts.wallH ?? DEFAULT_PAV_WALL_H;
  if (h != null) {
    if (opts.tiers === 2) {
      opts.wallH = Math.min(wallH, (h - 1.6) / 2.2);
      opts.rh = (h - opts.wallH * 1.62) / 1.27;
    } else {
      opts.wallH = Math.min(wallH, h - 1.6);
      opts.rh = h - opts.wallH;
    }
  } else if (opts.rh == null) {
    opts.rh = clamp(depth * 0.3, MIN_ROOF_H, MAX_ROOF_H);
  }
  S.base = floor - LAND_Y;
  return pavilion(S, cx, cz, width, depth, angle, floor, opts);
}

// a tiled hall on its own masonry plinth, floor level with the highest ground under it
function hallAt(S, cx, cz, width, depth, angle, { plinth = 0.8, floor = null, tiers = 1, wallH = 3.4, roof = TOMB_COL.roofYOld, wall = TOMB_COL.lacquerOld, over = 1.2, plinthCol = TOMB_COL.stone, h = null } = {}) {
  const floorY = floor ?? levelTop(cx, cz, width + 2, depth + 2, angle, plinth);
  if (floor == null) terrace(S, cx, cz, width + 2, depth + 2, angle, floorY, plinthCol);
  const top = pav(S, cx, cz, width, depth, angle, floorY, { tiers, wallH, roof, wall, over, h });
  return { floor: floorY, top };
}

// a flight of steps from pt0 (y0) to pt1 (y1), each step from its own ground; optional balustrades
function flight(S, pt0, y0, pt1, y1, width, { col = TOMB_COL.stone, rail = 0, railCol = null, dragon = false } = {}) {
  if (y1 < y0) { [pt0, pt1] = [pt1, pt0]; [y0, y1] = [y1, y0]; }
  const dx = pt1[0] - pt0[0], dz = pt1[1] - pt0[1];
  const len = Math.hypot(dx, dz);
  if (len < 0.4 || y1 - y0 < 0.05) return;
  const angle = Math.atan2(dz, dx);
  const ux = dx / len, uz = dz / len;
  const steps = clamp(Math.ceil((y1 - y0) / STEP_MAX_RISE), 1, Math.max(1, Math.min(MAX_STEPS, Math.floor(len / STEP_MIN_TREAD))));
  S.kind = KIND.MASONRY;
  for (let k = 0; k < steps; k++) {
    const frac = (k + 0.5) / steps;
    const cx = pt0[0] + dx * frac, cz = pt0[1] + dz * frac;
    const top = y0 + ((y1 - y0) * (k + 1)) / steps;
    const lo = Math.min(gY(cx - (uz * width) / 2, cz + (ux * width) / 2), gY(cx + (uz * width) / 2, cz - (ux * width) / 2), gY(cx, cz)) - 1;
    S.base = lo - LAND_Y;
    S.box(cx, cz, Math.min(lo, top - 0.3), top, len / steps + 0.03, width, angle, col, { topKind: KIND.ROAD });
  }
  if (rail) {
    const rc = railCol || shade(col, 0.92);
    const railW = dragon ? 0.7 : 0.4;
    for (const side of [-1, 1]) balustrade(S, pt0, y0, pt1, y1, side * (width / 2 + railW / 2), { col: rc, dragon });
  }
}

// one balustrade along a stair pt0 (y0) → pt1 (y1, the upper end), offset lateralOff to the left of the climb
function balustrade(S, pt0, y0, pt1, y1, lateralOff, { col, dragon = false }: Record<string, any> = {}) {
  if (y1 < y0) { [pt0, pt1] = [pt1, pt0]; [y0, y1] = [y1, y0]; }
  const dx = pt1[0] - pt0[0], dz = pt1[1] - pt0[1];
  const len = Math.hypot(dx, dz);
  if (len < 0.4) return;
  const angle = Math.atan2(dz, dx);
  const ux = dx / len, uz = dz / len;
  const railW = dragon ? 0.7 : 0.4;
  const railH = dragon ? 1.3 : 0.9;
  const ox = -uz * lateralOff, oz = ux * lateralOff;
  S.kind = KIND.MASONRY;
  S.beam([pt0[0] + ox, y0 + railH / 2, pt0[1] + oz], [pt1[0] + ox, y1 + railH / 2, pt1[1] + oz], railW, railH, col);
  if (dragon) {
    S.box(pt0[0] + ox - ux * 0.6, pt0[1] + oz - uz * 0.6, y0 - 0.2, y0 + 2.0, 1.6, railW + 0.3, angle, col, { taper: 0.75 });
    S.box(pt0[0] + ox - ux * 1.2, pt0[1] + oz - uz * 1.2, y0 + 1.5, y0 + 2.4, 1.1, railW + 0.1, angle, shade(col, 0.9));
    for (const frac of [0.3, 0.62]) {
      S.beam(
        [pt0[0] + ox + dx * (frac - 0.08), y0 + (y1 - y0) * (frac - 0.08) + railH, pt0[1] + oz + dz * (frac - 0.08)],
        [pt0[0] + ox + dx * (frac + 0.08), y0 + (y1 - y0) * (frac + 0.08) + railH, pt0[1] + oz + dz * (frac + 0.08)],
        railW * 0.8, 0.5, shade(col, 0.95),
      );
    }
    S.box(pt1[0] + ox, pt1[1] + oz, y1 - 0.2, y1 + 1.7, 0.9, 0.9, angle, col, { top: shade(col, 1.1) });
  }
}

// a wall following a ring (or an open line), each segment from its own ground
function wallLine(S, pts, height, thick, { col = TOMB_COL.brickMoss, cap = TOMB_COL.stoneDark, closed = true, maxSeg = 10, ground = null } = {}) {
  S.kind = KIND.MASONRY;
  const count = pts.length;
  const edgeCount = closed ? count : count - 1;
  for (let i = 0; i < edgeCount; i++) {
    const ptA = pts[i];
    const ptB = pts[(i + 1) % count];
    const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    if (len < 0.3) continue;
    const angle = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
    const pointAt = (frac) => [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac];
    const spanLevel = (segStart, segEnd) => {
      if (ground != null) return [ground - 0.5, ground];
      const samples = [gY(segStart[0], segStart[1]), gY(segEnd[0], segEnd[1]), gY((segStart[0] + segEnd[0]) / 2, (segStart[1] + segEnd[1]) / 2)];
      return [Math.min(...samples) - 0.6, Math.max(...samples)];
    };
    const segCount = Math.ceil(len / maxSeg);
    for (let k = 0; k < segCount; k++) {
      const segStart = pointAt(k / segCount);
      const segEnd = pointAt((k + 1) / segCount);
      const [lo, hi] = spanLevel(segStart, segEnd);
      S.base = lo - LAND_Y;
      S.box((segStart[0] + segEnd[0]) / 2, (segStart[1] + segEnd[1]) / 2, lo, hi + height, len / segCount + thick * 0.6, thick, angle, col, { top: cap });
    }
  }
}

// a masonry gate: width along the wall line (angle), the passage runs across it
function gate(S, cx, cz, angle, width, depth, { h = 5, openings = 3, roof = TOMB_COL.roofY, col = TOMB_COL.brickMoss, upper = false, floor = null, rh = null } = {}) {
  if (width < depth) { [width, depth] = [depth, width]; angle += Math.PI / 2; }
  const { lo, hi } = groundSpan(rectPts(cx, cz, width, depth, angle));
  const floorY = floor ?? hi;
  S.kind = KIND.MASONRY;
  S.base = floorY - LAND_Y;
  S.box(cx, cz, lo - 0.8, floorY + h, width, depth, angle, col, { top: shade(col, 0.9) });
  const ux = Math.cos(angle), uz = Math.sin(angle);
  const bayW = width / openings;
  const midIdx = (openings - 1) / 2;
  S.kind = KIND.PLAIN;
  for (let k = 0; k < openings; k++) {
    const off = (k - midIdx) * bayW;
    const isMain = Math.abs(k - midIdx) < 0.6;
    const openW = Math.min(3.4, bayW * 0.55) * (isMain ? 1 : 0.82);
    const openH = Math.min(h * 0.66, 3.8) * (isMain ? 1 : 0.85);
    S.box(cx + ux * off, cz + uz * off, floorY, floorY + openH, openW, depth + 0.14, angle, TOMB_COL.door);
  }
  let top = floorY + h;
  if (roof) {
    const roofH = rh ?? clamp(depth * 0.45, 1.2, 3);
    S.hip(cx, cz, width, depth, angle, top, roofH, roof, { flare: 0.35, over: 0.8, fascia: 0.25, fasciaCol: shade(col, 0.8), ridgeCol: RIDGE_COL, hips: true, glazed: true });
    if (upper) {
      const upperFloor = top + roofH * 0.45;
      S.kind = KIND.TIMBER;
      S.base = upperFloor - LAND_Y;
      S.box(cx, cz, upperFloor, upperFloor + 2.4, width * 0.5, depth * 0.62, angle, TOMB_COL.lacquerOld);
      S.hip(cx, cz, width * 0.5, depth * 0.62, angle, upperFloor + 2.4, roofH * 0.8, roof, { flare: 0.3, over: 0.7, fascia: 0.2, ridgeCol: RIDGE_COL, hips: true, glazed: true });
      top = upperFloor + 2.4 + roofH * 0.8;
    } else {
      top += roofH;
    }
  }
  S.kind = KIND.PLAIN;
  return top;
}

function bridge(S, pt0, pt1, width, { col = TOMB_COL.stone, arch = 0.5, rail = true } = {}) {
  const len = Math.hypot(pt1[0] - pt0[0], pt1[1] - pt0[1]);
  if (len < 1) return;
  const y0 = Math.max(gY(pt0[0], pt0[1]), LAND_Y) + 0.15;
  const y1 = Math.max(gY(pt1[0], pt1[1]), LAND_Y) + 0.15;
  const crownY = Math.max(y0, y1, LAND_Y + 0.3) + arch;
  const pointAt = (frac) => [pt0[0] + (pt1[0] - pt0[0]) * frac, pt0[1] + (pt1[1] - pt0[1]) * frac];
  const segCount = Math.max(BRIDGE_MIN_SEGS, Math.min(BRIDGE_MAX_SEGS, Math.round(len / 1.5)));
  const yAt = (frac) => y0 + (y1 - y0) * frac + (crownY - (y0 + (y1 - y0) * 0.5)) * Math.pow(Math.sin(Math.PI * frac), 0.6);
  const knots = Array.from({ length: segCount + 1 }, (_, i) => [i / segCount, yAt(i / segCount)]);
  const ux = (pt1[0] - pt0[0]) / len, uz = (pt1[1] - pt0[1]) / len;
  S.kind = KIND.MASONRY;
  S.base = 0;
  for (let i = 0; i < segCount; i++) {
    const [fa, ya] = knots[i];
    const [fb, yb] = knots[i + 1];
    const segA = pointAt(fa), segB = pointAt(fb);
    S.beam([segA[0], ya - 0.3, segA[1]], [segB[0], yb - 0.3, segB[1]], width, 0.6, col);
    if (rail) {
      for (const side of [-1, 1]) {
        const ox = -uz * side * (width / 2 - 0.15);
        const oz = ux * side * (width / 2 - 0.15);
        S.beam([segA[0] + ox, ya + 0.3, segA[1] + oz], [segB[0] + ox, yb + 0.3, segB[1] + oz], 0.25, 0.6, shade(col, 0.9));
      }
    }
  }
  for (const frac of [0.3, 0.7]) {
    const pierPt = pointAt(frac);
    S.box(pierPt[0], pierPt[1], POND_Y - 0.8, yAt(frac) - 0.5, 1.2, width * 0.9, Math.atan2(uz, ux), shade(col, 0.85));
  }
}

// statues: the stone mandarins, elephants and horses of src/landmarks/props.js, each on its own ground.
function mandarin(S, x, z, angle, col = MANDARIN_COL, military = false) {
  Props.mandarin(S, x, gY(x, z), z, angle, { col, military });
}

function beast(S, x, z, angle, isElephant, col = MANDARIN_COL) {
  if (isElephant) Props.elephant(S, x, gY(x, z), z, angle, { col });
  else Props.horse(S, x, gY(x, z), z, angle, { col });
}

// two rows a side: beasts first (nearest the gate), then mandarins; statues face the axis
function statueCourt(S, frame, s0, s1, { inner = 5, outer = 8, beasts = true, col = MANDARIN_COL } = {}) {
  const count = clamp(Math.floor((s1 - s0) / 4.2) + 1, 2, 6);
  const step = count > 1 ? (s1 - s0) / (count - 1) : 0;
  for (const side of [-1, 1]) {
    for (let k = 0; k < count; k++) {
      const along = s0 + step * k;
      const face = frame.av + (side > 0 ? Math.PI : 0);
      const innerPt = frame.at(along, side * inner);
      mandarin(S, innerPt[0], innerPt[1], face, col);
      const outerPt = frame.at(along, side * outer);
      if (beasts && k < 2) beast(S, outerPt[0], outerPt[1], frame.a, k === 0, col);
      else mandarin(S, outerPt[0], outerPt[1], face, col, true);
    }
  }
}

function obelisk(S, x, z, height = 9, col = TOMB_COL.stone) {
  const ground = gY(x, z);
  S.kind = KIND.MASONRY;
  S.base = ground - LAND_Y;
  S.box(x, z, ground - 0.6, ground + 1.3, 2.0, 2.0, 0, shade(col, 0.9));
  S.box(x, z, ground + 1.3, ground + height - 0.9, 1.15, 1.15, 0, col, { taper: 0.55 });
  S.box(x, z, ground + height - 0.9, ground + height, 0.7, 0.7, 0, shade(col, 1.05), { taper: 0.05 });
}

// Shared architectural primitives used by per-place tomb replicas (e.g. places/minhmang.js)
export { TOMB_COL, gY, groundSpan, rectPts, terrace, levelTop, pav, hallAt, flight, balustrade, wallLine, gate, bridge, mandarin, beast, statueCourt, obelisk };
