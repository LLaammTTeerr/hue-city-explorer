// The bronze objects of the Imperial City's courts that no place model draws itself: the nine holy cannons (Cửu vị
// thần công, cast 1803-04) in their two houses inside Cửa Quảng Đức and Cửa Thể Nhơn, and the great cauldrons (vạc
// đồng, cast 1659-1684 under the Nguyễn lords) of the Cần Chánh court and before the ruin of Càn Thành.
import { KIND, hex, shade, unflat, obb } from '../geo/buf.ts';
import { LAND_Y, PAL } from '../config.ts';
import { rise } from '../geo/terrain.ts';
import { vac, cannon, PROP_COL } from './props.ts';

const groundY = (x, z) => LAND_Y + rise(x, z);

// the Cần Chánh / Thái Hòa frame (places/canchanh.js): u toward Tả Vu (the king's left), v toward Ngọ Môn
const CC_ORIGIN = [-1180.85, -64.2];
const CC_FV = [0.5978, 0.8016];
const CC_FU = [0.8016, -0.5978];
const CC_ANGLE = Math.atan2(CC_FU[1], CC_FU[0]);
const ccPoint = (u, v) => [CC_ORIGIN[0] + CC_FU[0] * u + CC_FV[0] * v, CC_ORIGIN[1] + CC_FU[1] * u + CC_FV[1] * v];

const VAC_SPOTS: [string, [number, number][]][] = [
  ['vạc before Tả Vu', [[27, 31], [25, 28], [24, 31], [22, 31], [20, 31]]],
  ['vạc before Hữu Vu', [[-27, 31], [-25, 28], [-24, 31], [-22, 31], [-20, 31]]],
  ['vạc left of Càn Thành', [[20, -55], [22, -53], [18, -52], [16, -55]]],
  ['vạc right of Càn Thành', [[-20, -55], [-22, -53], [-18, -52], [-16, -55]]],
];
const VAC_DIAMETER = 2.0;
const VAC_CLEAR_H = 1.7;

const CANNON_HOUSES = [
  { name: 'Quảng Đức cannon house', center: [-1118.8, 329.3], count: 5 },
  { name: 'Thể Nhơn cannon house', center: [-813.4, 108.1], count: 4 },
];
const HOUSE_ROOF = hex('#7a5a46');
const HOUSE_COL = PAL.lacquer;
const HOUSE_PLINTH = hex('#a69e8e');
const HOUSE_FLOOR = hex('#b2a996');
const FLOOR_NORMAL_COS = 0.95;

function bary(px, pz, ax, az, bx, bz, cx, cz) {
  const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (Math.abs(det) < 1e-9) return null;
  const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
  const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
  const l3 = 1 - l1 - l2;
  return l1 >= -1e-6 && l2 >= -1e-6 && l3 >= -1e-6 ? [l1, l2, l3] : null;
}

function overlapsSpot(spot, ax, az, bx, bz, cx, cz) {
  for (const [vx, vz] of [[ax, az], [bx, bz], [cx, cz]]) {
    if (Math.abs(vx - spot.x) <= spot.r && Math.abs(vz - spot.z) <= spot.r) return true;
  }
  for (const du of [-1, 0, 1]) {
    for (const dv of [-1, 0, 1]) {
      if (bary(spot.x + du * spot.r, spot.z + dv * spot.r, ax, az, bx, bz, cx, cz)) return true;
    }
  }
  return false;
}

// the floor under (x, z) within r of it and the highest face of a model in the column above it
function surveySpots(S, spots) {
  const pos = S.pos;
  const spotCount = spots.length;
  const baseGs = new Float64Array(spotCount);
  let allMinX = Infinity, allMaxX = -Infinity, allMinZ = Infinity, allMaxZ = -Infinity;
  for (let j = 0; j < spotCount; j++) {
    const s = spots[j];
    baseGs[j] = groundY(s.x, s.z);
    if (s.x - s.r < allMinX) allMinX = s.x - s.r;
    if (s.x + s.r > allMaxX) allMaxX = s.x + s.r;
    if (s.z - s.r < allMinZ) allMinZ = s.z - s.r;
    if (s.z + s.r > allMaxZ) allMaxZ = s.z + s.r;
  }
  const results = spots.map(() => ({ floor: -Infinity, top: -Infinity, faces: null as [number, number, boolean][] | null }));
  for (let i = 0; i < S.n; i += 3) {
    const base = i * 3;
    const ax = pos[base], az = pos[base + 2];
    const bx = pos[base + 3], bz = pos[base + 5];
    const cx = pos[base + 6], cz = pos[base + 8];
    const x0 = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx);
    if (x0 > allMaxX) continue;
    const x1 = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx);
    if (x1 < allMinX) continue;
    const z0 = az < bz ? (az < cz ? az : cz) : (bz < cz ? bz : cz);
    if (z0 > allMaxZ) continue;
    const z1 = az > bz ? (az > cz ? az : cz) : (bz > cz ? bz : cz);
    if (z1 < allMinZ) continue;

    const ay = pos[base + 1], by = pos[base + 4], cy = pos[base + 7];
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const isLevel = ny > 1e-6 && ny > FLOOR_NORMAL_COS * Math.hypot(nx, ny, nz);
    const minY = Math.min(ay, by, cy), maxY = Math.max(ay, by, cy);
    for (let j = 0; j < spotCount; j++) {
      const spot = spots[j];
      if (x1 < spot.x - spot.r || x0 > spot.x + spot.r || z1 < spot.z - spot.r || z0 > spot.z + spot.r) continue;
      if (!overlapsSpot(spot, ax, az, bx, bz, cx, cz)) continue;
      const entry = results[j];
      if (isLevel) {
        const weights = bary(spot.x, spot.z, ax, az, bx, bz, cx, cz);
        if (weights) {
          const hitY = weights[0] * ay + weights[1] * by + weights[2] * cy;
          if (hitY < baseGs[j] + 3 && hitY > entry.floor) entry.floor = hitY;
        }
        (entry.faces = entry.faces || []).push([minY, maxY, true]);
      } else {
        (entry.faces = entry.faces || []).push([minY, maxY, false]);
      }
    }
  }
  return results.map((entry, j) => {
    const floor = entry.floor > -Infinity ? entry.floor : baseGs[j];
    const block = (entry.faces || []).filter(([lo, hi, isLevel]) => hi > floor + (isLevel ? 0.08 : 0.2) && lo < floor + spots[j].h);
    return { floor, hit: block.length > 0, block };
  });
}

function buildCauldrons(S, placed) {
  const candidates = [];
  for (const [name, coords] of VAC_SPOTS) {
    for (const [u, v] of coords) {
      const pt = ccPoint(u, v);
      candidates.push({ name, x: pt[0], z: pt[1], r: VAC_DIAMETER * 0.62, h: VAC_CLEAR_H });
    }
  }
  const survey = surveySpots(S, candidates);
  const done = new Set();
  candidates.forEach((cand, idx) => {
    if (done.has(cand.name) || survey[idx].hit) return;
    done.add(cand.name);
    vac(S, cand.x, survey[idx].floor, cand.z, CC_ANGLE, { d: VAC_DIAMETER });
    placed.push([cand.name, cand.x, survey[idx].floor, cand.z]);
  });
  for (const [name] of VAC_SPOTS) if (!done.has(name)) console.warn(`courtyard: no clear floor for the ${name}; not drawn`);
}

function buildCannonHouse(S, data, houseSpec, otherCenter, placed) {
  let bldIdx = -1;
  (data.bld || []).forEach((bld, idx) => {
    const ring = unflat(bld[0]);
    const center = ring.reduce((acc, pt) => [acc[0] + pt[0] / ring.length, acc[1] + pt[1] / ring.length], [0, 0]);
    if (Math.hypot(center[0] - houseSpec.center[0], center[1] - houseSpec.center[1]) < 4) bldIdx = idx;
  });
  if (bldIdx < 0) { console.warn(`courtyard: ${houseSpec.name} not among the mapped buildings; not drawn`); return; }
  const ring = unflat(data.bld[bldIdx][0]);
  data.bld.splice(bldIdx, 1);

  const box = obb(ring);
  let angle = box.a, width = box.w, depth = box.d;
  if (depth > width) { angle += Math.PI / 2; [width, depth] = [depth, width]; }
  const ux = Math.cos(angle), uz = Math.sin(angle);
  const vx = -uz, vz = ux;
  const toWorld = (u, v) => [box.c[0] + ux * u + vx * v, box.c[1] + uz * u + vz * v];
  const faceSign = (otherCenter[0] - box.c[0]) * vx + (otherCenter[1] - box.c[1]) * vz > 0 ? 1 : -1;

  let baseG = Infinity;
  for (const pt of ring) baseG = Math.min(baseG, groundY(pt[0], pt[1]));
  const floorY = baseG + 0.45, eaveY = baseG + 3.2;
  S.base = baseG - LAND_Y;
  S.kind = KIND.MASONRY;
  S.box(box.c[0], box.c[1], baseG - 0.3, floorY, width + 0.6, depth + 0.6, angle, HOUSE_PLINTH, { top: HOUSE_FLOOR, topKind: KIND.ROAD });

  const stepPt = toWorld(0, faceSign * (depth / 2 + 0.55));
  S.box(stepPt[0], stepPt[1], baseG - 0.2, baseG + 0.22, 3.0, 0.5, angle, HOUSE_PLINTH, { topKind: KIND.ROAD });

  S.kind = KIND.TIMBER;
  const colBays = Math.max(2, Math.round(width / 3.6));
  const halfU = width / 2 - 0.3, halfV = depth / 2 - 0.3;
  for (let i = 0; i <= colBays; i++) {
    for (const sideV of [-1, 1]) {
      const colPt = toWorld(-halfU + (2 * halfU * i) / colBays, sideV * halfV);
      S.cyl(colPt[0], colPt[1], floorY, eaveY, 0.16, 0.15, 6, HOUSE_COL, { cap: false });
    }
  }
  for (const sideU of [-1, 1]) {
    const colPt = toWorld(sideU * halfU, 0);
    S.cyl(colPt[0], colPt[1], floorY, eaveY, 0.16, 0.15, 6, HOUSE_COL, { cap: false });
  }

  S.kind = KIND.MASONRY;
  const backWallPt = toWorld(0, -faceSign * halfV);
  S.box(backWallPt[0], backWallPt[1], floorY, floorY + 0.9, 2 * halfU, 0.25, angle, shade(HOUSE_PLINTH, 1.05));

  S.kind = KIND.TIMBER;
  for (const sideV of [-1, 1]) {
    const p0 = toWorld(-halfU, sideV * halfV), p1 = toWorld(halfU, sideV * halfV);
    S.beam([p0[0], eaveY - 0.12, p0[1]], [p1[0], eaveY - 0.12, p1[1]], 0.22, 0.26, shade(HOUSE_COL, 0.7));
  }
  S.hip(box.c[0], box.c[1], width, depth, angle, eaveY, 2.0, HOUSE_ROOF, { flare: 0.35, over: 0.9, hips: true, fascia: 0.18, fasciaCol: shade(HOUSE_COL, 0.6), ridgeCol: shade(HOUSE_ROOF, 1.2), segs: 3 });

  const spacing = (2 * halfU) / houseSpec.count;
  const barrelLen = Math.min(5.1, depth - 0.4);
  for (let i = 0; i < houseSpec.count; i++) {
    const cannonPt = toWorld(-halfU + spacing * (i + 0.5), faceSign * 0.15);
    cannon(S, cannonPt[0], floorY, cannonPt[1], angle + (faceSign > 0 ? Math.PI / 2 : -Math.PI / 2), { len: barrelLen, col: PROP_COL.bronze });
    placed.push([`${houseSpec.name} cannon ${i + 1}`, cannonPt[0], floorY, cannonPt[1]]);
  }
  S.kind = KIND.PLAIN;
}

export function buildCourtyard(data, S) {
  const placed = [];
  const startIdx = S.n;
  for (const houseSpec of CANNON_HOUSES) {
    buildCannonHouse(S, data, houseSpec, CANNON_HOUSES.find((other) => other !== houseSpec).center, placed);
  }
  buildCauldrons(S, placed);
  (S.paved = S.paved || []).push([startIdx, S.n]);
  S.courtyard = placed;
  return placed;
}
