import { Buf, KIND, hex, shade, mix, obb, unflat, signedArea, inRing, rand } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { glowPoints, lightMaterial } from '../../geo/materials.ts';
import { pavilion } from '../citadel.ts';
import { landTest } from '../boats.ts';
import { streetTest, offStreets } from '../enclosure.ts';

// ---- Chùa Thiên Mụ, the pagoda on Hà Khê hill above the Hương river ----
// Sources: docs/places/thienmu.md (Phước Duyên 21 m 7-tier tower 1844, Tam Quan gate, Đại Hùng Bảo Điện,
// bell & turtle stele pavilions, square stele houses, guardian halls, halls behind, stupa, stair & landing).

export const id = 'thienmu';
export const dataReach = 120;

const TOWER_CENTER = [-4678.5, 1824.9];
const COMPOUND_ANG = -0.237; // Tam Quan's long side; +v runs out to the river
const AXIS_UX = Math.cos(COMPOUND_ANG);
const AXIS_UZ = Math.sin(COMPOUND_ANG);
const toWorld = (u, v): [number, number] => [TOWER_CENTER[0] + u * AXIS_UX - v * AXIS_UZ, TOWER_CENTER[1] + u * AXIS_UZ + v * AXIS_UX];
const toLocal = (x, z) => { const dx = x - TOWER_CENTER[0], dz = z - TOWER_CENTER[1]; return [dx * AXIS_UX + dz * AXIS_UZ, -dx * AXIS_UZ + dz * AXIS_UX]; };

const DAIHUNG = [[-4717.0, 1732.7], [-4687.4, 1725.9], [-4681.4, 1751.5], [-4695.5, 1754.7], [-4711.1, 1758.2]];
const STELE_HOUSES = [
  [[-4663.8, 1828.9], [-4660.2, 1828.1], [-4659.5, 1831.3], [-4663.0, 1832.1]],
  [[-4693.8, 1838.5], [-4688.5, 1837.2], [-4687.8, 1840.2], [-4693.1, 1841.5]],
];
const GUARD_HALLS = [
  [[-4712.0, 1794.2], [-4706.0, 1792.8], [-4704.1, 1801.1], [-4710.1, 1802.4]],
  [[-4666.7, 1784.8], [-4660.7, 1783.5], [-4658.8, 1791.8], [-4664.8, 1793.1]],
];
const HALLS = [
  [[-4717.7, 1692.1], [-4703.2, 1688.2], [-4699.9, 1700.4], [-4714.4, 1704.3]],
  [[-4734.3, 1730.8], [-4738.9, 1731.9], [-4744.2, 1708.2], [-4730.9, 1705.3], [-4727.9, 1704.6], [-4721.8, 1732.0], [-4733.4, 1734.6]],
  [[-4744.2, 1708.2], [-4748.1, 1690.7], [-4734.9, 1688.0], [-4730.9, 1705.3]],
  [[-4747.2, 1726.6], [-4756.5, 1728.3], [-4760.3, 1708.1], [-4751.1, 1706.3]],
  [[-4732.7, 1657.9], [-4708.6, 1652.0], [-4704.7, 1667.7], [-4728.9, 1673.5]],
  [[-4777.9, 1668.0], [-4767.2, 1665.4], [-4757.6, 1704.9], [-4768.1, 1707.2]],
];
const STUPA_POS = [-4738.6, 1583.5];
const SIDE_GATES = [[-4663.9, 1750.5], [-4738.6, 1767.1]];
const EAST_GATE_SIGHT = { at: [-4641.8, 1777.2], bearing: 202 };
const WEST_BROW = [[-48, -75], [-20, 13]];

const STAIR_HALF_W = 4.2;
const FRONT_BROW_V = 13.0;
const BANK_SLOPE = 0.9;
const GATE_WIDTH = 3.6;
const TOWER_TOTAL_H = 21;
const TOWER_TIERS = 7;

const COL = {
  stone: PAL.stone, brick: hex('#b8897a'), eave: hex('#5b5352'), trim: hex('#e9dfcd'), dark: hex('#2b2422'),
  roof: hex('#80594b'), wall: PAL.templeWall, lac: PAL.lacquer, ridge: hex('#d8c9a0'), gold: hex('#d9c27a'),
  lime: hex('#d9d2c2'), grey: hex('#8d8a84'), bronze: hex('#5d5a43'), pave: hex('#b49a80'),
  rubble: hex('#8d8576'), coping: hex('#a19d92'), hall: hex('#d3bd8c'), moss: hex('#6f7358'),
  render: hex('#a9a395'), grille: hex('#3b2d23'),
};
const LANTERN_RGB = [1.0, 0.72, 0.34];

// clip a ring (local u,v) to the half plane planeA*u + planeB*v <= planeC
function clipHalfPlane(ring, planeA, planeB, planeC) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % ring.length];
    const distA = planeA * ptA[0] + planeB * ptA[1] - planeC;
    const distB = planeA * ptB[0] + planeB * ptB[1] - planeC;
    if (distA <= 0) out.push(ptA);
    if ((distA < 0 && distB > 0) || (distA > 0 && distB < 0)) {
      const frac = distA / (distA - distB);
      out.push([ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac]);
    }
  }
  return out;
}

function halfPlaneThrough(ptA, ptB, insidePt): [number, number, number] {
  const len = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
  let a = -(ptB[1] - ptA[1]) / len, b = (ptB[0] - ptA[0]) / len, c = a * ptA[0] + b * ptA[1];
  if (a * insidePt[0] + b * insidePt[1] > c) { a = -a; b = -b; c = -c; }
  return [a, b, c];
}

function segDist2D(u, v, ptA, ptB) {
  const ex = ptB[0] - ptA[0], ev = ptB[1] - ptA[1], lenSq = ex * ex + ev * ev || 1;
  const frac = Math.max(0, Math.min(1, ((u - ptA[0]) * ex + (v - ptA[1]) * ev) / lenSq));
  return Math.hypot(ptA[0] + ex * frac - u, ptA[1] + ev * frac - v);
}

// ---------------- rubble wall & arched gate builders ----------------

function makeWallBuilders(S, courtY) {
  let stoneSeed = 1;
  const rubble = (origin, tan, nrm, s0, s1, y0, y1) => {
    S.kind = KIND.PLAIN;
    const seed = (stoneSeed += 977);
    for (let y = y0, row = 0; y < y1 - 0.06; row++) {
      const rowH = Math.min(y1 - y, 0.2 + 0.2 * rand(seed + row, 1));
      for (let cursor = s0 - 0.3 * rand(seed + row, 2), colIdx = 0; cursor < s1; colIdx++) {
        const stoneSeedKey = seed + row * 61 + colIdx;
        const stoneW = 0.28 + 0.45 * rand(stoneSeedKey, 3);
        const p0 = Math.max(s0, cursor + 0.03), p1 = Math.min(s1, cursor + stoneW - 0.03);
        if (p1 - p0 > 0.06) {
          const outOff = 0.015 + 0.025 * rand(stoneSeedKey, 4);
          const ya = y + 0.03 + 0.03 * rand(stoneSeedKey, 5);
          const yb = y + rowH - 0.03 - 0.04 * rand(stoneSeedKey, 6);
          const heightFrac = Math.max(0, Math.min(1, (yb - y0) / Math.max(0.5, y1 - y0)));
          const col = mix(shade(COL.rubble, 0.72 + 0.45 * rand(stoneSeedKey, 8)), shade(COL.moss, 0.8 + 0.3 * rand(stoneSeedKey, 9)), heightFrac * heightFrac * 0.7 * rand(stoneSeedKey, 10));
          const pt3 = (dist, yy): [number, number, number] => [origin[0] + tan[0] * dist + nrm[0] * outOff, yy, origin[1] + tan[1] * dist + nrm[1] * outOff];
          S.quad(pt3(p0, ya), pt3(p1, ya), pt3(p1, yb), pt3(p0, yb), col, [nrm[0], 0, nrm[1]]);
        }
        cursor += stoneW;
      }
      y += rowH;
    }
  };
  const coping = (origin, tan, nrm, s0, s1, inset, thick, topY) => {
    S.kind = KIND.PLAIN;
    const ang = Math.atan2(tan[1], tan[0]);
    for (let cursor = s0; cursor < s1 - 0.05;) {
      const slabSeed = (stoneSeed += 13);
      const slabW = Math.min(s1 - cursor, 0.6 + 0.6 * rand(slabSeed, 1)), mid = cursor + slabW / 2;
      const x = origin[0] + tan[0] * mid - nrm[0] * inset, z = origin[1] + tan[1] * mid - nrm[1] * inset;
      S.box(x, z, topY, topY + 0.1 + 0.1 * rand(slabSeed, 2), slabW + 0.02, thick + 0.12 + 0.06 * rand(slabSeed, 3), ang, mix(shade(COL.coping, 0.8 + 0.25 * rand(slabSeed, 4)), COL.moss, 0.45 * rand(slabSeed, 5)));
      cursor += slabW;
    }
  };
  const rubbleWall = (origin, tan, nrm, s0, s1, footY, baseY, topY, thick) => {
    const mid = (s0 + s1) / 2, inset = thick / 2 + 0.02, ang = Math.atan2(tan[1], tan[0]);
    S.kind = KIND.PLAIN;
    S.box(origin[0] + tan[0] * mid - nrm[0] * inset, origin[1] + tan[1] * mid - nrm[1] * inset, baseY, topY, s1 - s0, thick, ang, shade(COL.rubble, 0.78));
    rubble(origin, tan, nrm, s0, s1, footY, topY);
    coping(origin, tan, nrm, s0, s1, inset, thick, topY);
  };
  const archedGate = (gatePt, tan, nrm) => {
    const ang = Math.atan2(tan[1], tan[0]), depth = 0.9, height = 3.1, openW = 1.8, radius = openW / 2, springY = courtY + 1.7;
    const ptAt = (along, out): [number, number] => [gatePt[0] + tan[0] * along - nrm[0] * (depth / 2 + 0.02 - out), gatePt[1] + tan[1] * along - nrm[1] * (depth / 2 + 0.02 - out)];
    const box = (along, out, ya, yb, w, d, col) => { const pt = ptAt(along, out); S.box(pt[0], pt[1], ya, yb, w, d, ang, col); };
    const pierW = (GATE_WIDTH - openW) / 2;
    S.kind = KIND.PLAIN;
    for (const side of [-1, 1]) box(side * (openW / 2 + pierW / 2), 0, courtY - 0.3, courtY + height, pierW, depth, COL.render);
    const halfAt = (y) => (y <= springY ? radius : Math.sqrt(Math.max(0, radius * radius - (y - springY) ** 2)));
    for (let k = 0; k < 6; k++) {
      const ya = springY + (radius * k) / 6, yb = springY + (radius * (k + 1)) / 6, hw = halfAt((ya + yb) / 2);
      for (const side of [-1, 1]) box(side * (hw + (radius - hw) / 2), 0, ya, yb, radius - hw + 0.01, depth, COL.render);
      box(0, 0, ya, yb, hw * 2, 0.06, COL.grille);
    }
    box(0, 0, springY + radius, courtY + height, openW, depth, COL.render);
    box(0, 0, courtY, springY, openW, 0.06, COL.grille);
    const barCol = shade(COL.grille, 1.7);
    for (const u of [-0.6, -0.3, 0, 0.3, 0.6]) box(u, 0, courtY + 0.05, springY + Math.sqrt(radius * radius - u * u) - 0.04, 0.05, 0.12, barCol);
    for (let y = courtY + 0.3; y < springY + radius - 0.1; y += 0.34) box(0, 0, y, y + 0.05, halfAt(y + 0.025) * 2 - 0.04, 0.12, barCol);
    for (const outSide of [-1, 1]) {
      for (const side of [-1, 1]) box(side * (openW / 2 + pierW / 2), outSide * (depth / 2 + 0.012), courtY + 0.45, courtY + 2.15, 0.4, 0.03, shade(COL.render, 0.78));
      box(0, outSide * (depth / 2 + 0.012), springY + radius + 0.08, courtY + height - 0.08, 1.5, 0.03, shade(COL.render, 0.7));
    }
    box(0, 0, courtY + height, courtY + height + 0.12, GATE_WIDTH + 0.3, depth + 0.3, shade(COL.render, 0.92));
    box(0, 0, courtY + height + 0.12, courtY + height + 0.22, GATE_WIDTH + 0.1, depth + 0.12, shade(COL.render, 0.84));
  };
  return { rubbleWall, archedGate };
}

// ---------------- terrain, banks & perimeter walls ----------------

function buildGroundAndWalls(ctx, hkRing) {
  const { data, S, THREE, courtY, onStreet, rubbleWall, archedGate } = ctx;
  const loc = hkRing.map((pt) => toLocal(pt[0], pt[1]));
  const negPlane = ([a, b, c]): [number, number, number] => [-a, -b, -c];
  const westPlane = halfPlaneThrough(WEST_BROW[0], WEST_BROW[1], [0, 0]);
  const frontPlane: [number, number, number] = [0, 1, FRONT_BROW_V];
  const planeDist = (plane, u, v) => plane[0] * u + plane[1] * v - plane[2];
  const levelRing = clipHalfPlane(clipHalfPlane(loc, ...westPlane), ...frontPlane);
  const distToLevel = (u, v) => {
    let best = Infinity;
    for (let i = 0; i < levelRing.length; i++) best = Math.min(best, segDist2D(u, v, levelRing[i], levelRing[(i + 1) % levelRing.length]));
    return best;
  };
  const bankY = (u, v) => Math.max(courtY - BANK_SLOPE * distToLevel(u, v), LAND_Y + rise(...toWorld(u, v)) + 0.15);
  const ccwRing = signedArea(hkRing) > 0;
  const outwardNormal = (ptA, ptB) => {
    const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], len = Math.hypot(dx, dz) || 1;
    return ccwRing ? [dz / len, -dx / len] : [-dz / len, dx / len];
  };

  // east apron strip between wall and lane
  const apron = [];
  const isEastEdge = (idx) => {
    const ptA = loc[idx], ptB = loc[(idx + 1) % loc.length];
    const mu = (ptA[0] + ptB[0]) / 2, mv = (ptA[1] + ptB[1]) / 2;
    return mu > 12 && mv > -80 && mv < 22;
  };
  let startIdx = -1;
  for (let i = 0; i < loc.length; i++) if (isEastEdge(i) && !isEastEdge((i - 1 + loc.length) % loc.length)) { startIdx = i; break; }
  if (startIdx >= 0) {
    const chain = [];
    for (let i = startIdx; isEastEdge(i % loc.length) && chain.length < loc.length; i++) chain.push(i % loc.length);
    const verts = [...chain, (chain[chain.length - 1] + 1) % loc.length];
    const outerWorld = [];
    verts.forEach((vertIdx, k) => {
      const pt = hkRing[vertIdx];
      if (k === 0 || k === verts.length - 1) { outerWorld.push(pt); return; }
      const n1 = outwardNormal(hkRing[verts[k - 1]], pt), n2 = outwardNormal(pt, hkRing[verts[k + 1]]);
      let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
      const len = Math.hypot(nx, nz) || 1;
      nx /= len; nz /= len;
      let reach = 0;
      for (let dist = 0.5; dist <= 14; dist += 0.5) {
        const x = pt[0] + nx * dist, z = pt[1] + nz * dist;
        if (onStreet(x, z, 0.6)) break;
        reach = dist;
        if (courtY - BANK_SLOPE * dist < LAND_Y + rise(x, z) + 0.15) break;
      }
      outerWorld.push([pt[0] + nx * reach, pt[1] + nz * reach]);
    });
    apron.push({ ring: verts.map((vertIdx) => loc[vertIdx]), outer: outerWorld.map((pt) => toLocal(pt[0], pt[1])), edges: new Set(chain) });
  }
  const apronRing = apron.length ? [...apron[0].ring, ...apron[0].outer.slice().reverse()] : [];

  // level court
  S.base = courtY - LAND_Y;
  const courtStart = S.n;
  S.kind = KIND.PLAIN;
  S.prism(levelRing.map(([u, v]) => toWorld(u, v)), LAND_Y - 0.6, courtY, shade(COL.rubble, 0.8), hex(PAL.green.sacred), { topKind: KIND.GROUND });
  (S.noCover = S.noCover || []).push([courtStart, S.n]);

  // sloped banks on a 2 m grid
  const bankPieces = [clipHalfPlane(loc, ...negPlane(westPlane))];
  const frontClip = clipHalfPlane(clipHalfPlane(loc, ...westPlane), ...negPlane(frontPlane));
  bankPieces.push(clipHalfPlane(frontClip, 1, 0, -STAIR_HALF_W - 0.6), clipHalfPlane(frontClip, -1, 0, -STAIR_HALF_W - 0.6));
  if (apronRing.length) bankPieces.push(apronRing);

  const bankStart = S.n, grassCol = hex(PAL.green.grass), cellSize = 2;
  S.kind = KIND.GROUND;
  for (const piece of bankPieces) {
    if (piece.length < 3) continue;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [u, v] of piece) { u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    for (let cu = Math.floor(u0 / cellSize) * cellSize; cu < u1; cu += cellSize) {
      for (let cv = Math.floor(v0 / cellSize) * cellSize; cv < v1; cv += cellSize) {
        let poly = clipHalfPlane(clipHalfPlane(clipHalfPlane(clipHalfPlane(piece, 1, 0, cu + cellSize), -1, 0, -cu), 0, 1, cv + cellSize), 0, -1, -cv);
        poly = poly.filter((pt, idx) => { const next = poly[(idx + 1) % poly.length]; return Math.hypot(next[0] - pt[0], next[1] - pt[1]) > 1e-3; });
        if (poly.length < 3 || Math.abs(signedArea(poly)) < 0.01) continue;
        const heights = poly.map(([u, v]) => bankY(u, v));
        S.base = heights.reduce((sum, h) => sum + h, 0) / heights.length - LAND_Y;
        const tone = 0.86 + 0.12 * rand(Math.round(cu * 7 + cv * 131) & 0xffff, 7);
        const faces = THREE.ShapeUtils.triangulateShape(poly.map(([u, v]) => new THREE.Vector2(u, v)), []);
        const worldPts = poly.map(([u, v], idx) => { const pt = toWorld(u, v); return [pt[0], heights[idx], pt[1]]; });
        for (const face of faces) S.tri(worldPts[face[0]], worldPts[face[1]], worldPts[face[2]], shade(grassCol, tone), [0, 1, 0]);
      }
    }
  }
  S.noCover.push([bankStart, S.n]);

  // precinct wall on the court's edge + front balustrade + gates
  const gatePts = [];
  const ccwLevel = signedArea(levelRing.map(([u, v]) => toWorld(u, v))) > 0;
  const sideGateLoc = [toLocal(SIDE_GATES[0][0], SIDE_GATES[0][1]), toLocal(SIDE_GATES[1][0], SIDE_GATES[1][1])];
  const sideGateDir = [sideGateLoc[1][0] - sideGateLoc[0][0], sideGateLoc[1][1] - sideGateLoc[0][1]];
  const wallTopAt = (x, z) => Math.min(courtY + 2.3, Math.max(courtY + 0.9, LAND_Y + rise(x, z) + 2.9));
  const onApron = (la, lb) => apron.length && apron[0].ring.some((pt, idx, ring) => idx + 1 < ring.length && segDist2D((la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2, pt, ring[idx + 1]) < 0.05);

  const sightLoc = toLocal(EAST_GATE_SIGHT.at[0], EAST_GATE_SIGHT.at[1]);
  const sightWorldDir = [Math.sin((EAST_GATE_SIGHT.bearing * Math.PI) / 180), -Math.cos((EAST_GATE_SIGHT.bearing * Math.PI) / 180)];
  const sightLocalDir = [sightWorldDir[0] * AXIS_UX + sightWorldDir[1] * AXIS_UZ, -sightWorldDir[0] * AXIS_UZ + sightWorldDir[1] * AXIS_UX];
  let eastHit = null;
  levelRing.forEach((la, idx) => {
    const lb = levelRing[(idx + 1) % levelRing.length];
    const ex = lb[0] - la[0], ev = lb[1] - la[1], den = sightLocalDir[0] * ev - sightLocalDir[1] * ex;
    if (Math.abs(den) < 1e-9) return;
    const wx = la[0] - sightLoc[0], wv = la[1] - sightLoc[1];
    const hitT = (wx * ev - wv * ex) / den, hitS = (wx * sightLocalDir[1] - wv * sightLocalDir[0]) / den;
    if (hitT > 0 && hitS > 0 && hitS < 1 && (!eastHit || hitT < eastHit.tt)) eastHit = { i: idx, tt: hitT, ss: hitS };
  });

  for (let i = 0; i < levelRing.length; i++) {
    const la = levelRing[i], lb = levelRing[(i + 1) % levelRing.length];
    const ptA = toWorld(la[0], la[1]), ptB = toWorld(lb[0], lb[1]);
    const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], len = Math.hypot(dx, dz);
    if (len < 0.3) continue;
    const tan = [dx / len, dz / len], nrm = ccwLevel ? [tan[1], -tan[0]] : [-tan[1], tan[0]];
    const isFront = Math.abs(la[1] - FRONT_BROW_V) < 0.05 && Math.abs(lb[1] - FRONT_BROW_V) < 0.05;
    const isBrow = Math.abs(planeDist(westPlane, la[0], la[1])) < 0.05 && Math.abs(planeDist(westPlane, lb[0], lb[1])) < 0.05;
    const isLevelWall = isBrow || onApron(la, lb);
    const segs = [[0, len]];
    const cutSpan = (s0, s1) => {
      for (let k = segs.length - 1; k >= 0; k--) {
        const [p0, p1] = segs[k];
        if (s1 <= p0 || s0 >= p1) continue;
        segs.splice(k, 1, ...[[p0, s0], [s1, p1]].filter(([q0, q1]) => q1 - q0 > 0.2));
      }
    };
    const gatePositions = [];
    if (isFront) {
      const alongOf = (u) => ((u - la[0]) / (lb[0] - la[0])) * len;
      cutSpan(Math.min(alongOf(-STAIR_HALF_W), alongOf(STAIR_HALF_W)), Math.max(alongOf(-STAIR_HALF_W), alongOf(STAIR_HALF_W)));
      for (const u of [-7.4, 7.4]) cutSpan(alongOf(u) - 0.8, alongOf(u) + 0.8);
    } else {
      const ex = lb[0] - la[0], ev = lb[1] - la[1], den = ex * sideGateDir[1] - ev * sideGateDir[0];
      if (Math.abs(den) > 1e-6) {
        const frac = ((sideGateLoc[0][0] - la[0]) * sideGateDir[1] - (sideGateLoc[0][1] - la[1]) * sideGateDir[0]) / den;
        if (frac > 0 && frac < 1) gatePositions.push(frac * len);
      }
      if (eastHit && eastHit.i === i) gatePositions.push(eastHit.ss * len);
      for (const pos of gatePositions) cutSpan(pos - GATE_WIDTH / 2 + 0.05, pos + GATE_WIDTH / 2 - 0.05);
    }

    for (const [s0, s1] of segs) {
      if (isFront) {
        const balH = 0.95, thick = 0.35, mid = (s0 + s1) / 2, segL = s1 - s0, ang = Math.atan2(tan[1], tan[0]);
        const x = ptA[0] + tan[0] * mid - nrm[0] * thick / 2, z = ptA[1] + tan[1] * mid - nrm[1] * thick / 2;
        S.kind = KIND.MASONRY;
        S.box(x, z, courtY - 0.3, courtY + balH, segL, thick, ang, COL.lime);
        S.kind = KIND.PLAIN;
        S.box(x, z, courtY + balH, courtY + balH + 0.14, segL, thick + 0.2, ang, COL.grey);
        for (let cursor = s0 + 2.4; cursor < s1 - 0.6; cursor += 2.4) {
          S.box(ptA[0] + tan[0] * cursor - nrm[0] * thick / 2, ptA[1] + tan[1] * cursor - nrm[1] * thick / 2, courtY, courtY + balH + 0.3, 0.45, 0.45, ang, COL.lime);
        }
        continue;
      }
      const chunks = Math.max(1, Math.ceil((s1 - s0) / 8));
      for (let k = 0; k < chunks; k++) {
        const p0 = s0 + ((s1 - s0) * k) / chunks, p1 = s0 + ((s1 - s0) * (k + 1)) / chunks, mid = (p0 + p1) / 2;
        const ox = ptA[0] + tan[0] * mid + nrm[0] * 2, oz = ptA[1] + tan[1] * mid + nrm[1] * 2;
        const top = isLevelWall ? courtY + 2.0 : wallTopAt(ox, oz);
        const foot = isLevelWall ? courtY - 0.3 : Math.min(courtY - 0.3, LAND_Y + rise(ox, oz) - 0.3);
        rubbleWall(ptA, tan, nrm, p0 - (k === 0 ? 0.1 : 0), p1 + (k === chunks - 1 ? 0.1 : 0), foot, courtY - 0.3, top, 0.55);
      }
    }
    for (const pos of gatePositions) {
      const gatePt = [ptA[0] + tan[0] * pos, ptA[1] + tan[1] * pos];
      archedGate(gatePt, tan, nrm);
      gatePts.push(toLocal(gatePt[0], gatePt[1]));
    }
  }

  // low rubble walls at the roads
  const roadWall = (pa, pb, outFn, isKerb = false) => {
    const ptA = toWorld(pa[0], pa[1]), ptB = toWorld(pb[0], pb[1]);
    const dx = ptB[0] - ptA[0], dz = ptB[1] - ptA[1], len = Math.hypot(dx, dz);
    if (len < 0.3) return;
    const tan = [dx / len, dz / len], nrm = outFn(ptA, ptB);
    const chunks = Math.max(1, Math.ceil(len / 3));
    for (let k = 0; k < chunks; k++) {
      const s0 = (len * k) / chunks, s1 = (len * (k + 1)) / chunks, mid = (s0 + s1) / 2;
      const lm = [pa[0] + ((pb[0] - pa[0]) * mid) / len, pa[1] + ((pb[1] - pa[1]) * mid) / len];
      const baseG = LAND_Y + rise(ptA[0] + tan[0] * mid + nrm[0] * 1.5, ptA[1] + tan[1] * mid + nrm[1] * 1.5);
      const top = isKerb ? Math.max(bankY(lm[0], lm[1]) + 0.05, baseG + 0.25) : Math.max(bankY(lm[0], lm[1]) + 0.45, baseG + 0.8);
      rubbleWall(ptA, tan, nrm, s0 - (k === 0 ? 0.05 : 0), s1 + (k === chunks - 1 ? 0.05 : 0), baseG - 0.3, baseG - 0.3, top, 0.5);
    }
  };
  for (let i = 0; i < loc.length; i++) {
    if (apron.length && apron[0].edges.has(i)) continue;
    const la = loc[i], lb = loc[(i + 1) % loc.length];
    const intervals = [];
    for (const plane of [westPlane, frontPlane]) {
      const fa = planeDist(plane, la[0], la[1]), fb = planeDist(plane, lb[0], lb[1]);
      if (fa <= 0 && fb <= 0) continue;
      if (fa > 0 && fb > 0) { intervals.push([0, 1]); continue; }
      const frac = fa / (fa - fb);
      intervals.push(fa > 0 ? [0, frac] : [frac, 1]);
    }
    if (!intervals.length) continue;
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [intervals[0].slice()];
    for (const [p0, p1] of intervals.slice(1)) {
      const last = merged[merged.length - 1];
      if (p0 <= last[1]) last[1] = Math.max(last[1], p1);
      else merged.push([p0, p1]);
    }
    const lerpLoc = (frac): [number, number] => [la[0] + (lb[0] - la[0]) * frac, la[1] + (lb[1] - la[1]) * frac];
    for (const [p0, p1] of merged) {
      const segA = lerpLoc(p0), segB = lerpLoc(p1);
      if (segA[1] > FRONT_BROW_V - 0.1 && segB[1] > FRONT_BROW_V - 0.1 && Math.max(segA[0], segB[0]) > -STAIR_HALF_W - 0.6 && Math.min(segA[0], segB[0]) < STAIR_HALF_W + 0.6) {
        const paramOf = (u) => (u - segA[0]) / (segB[0] - segA[0]);
        const c0 = Math.max(0, Math.min(1, Math.min(paramOf(-STAIR_HALF_W - 0.6), paramOf(STAIR_HALF_W + 0.6))));
        const c1 = Math.max(0, Math.min(1, Math.max(paramOf(-STAIR_HALF_W - 0.6), paramOf(STAIR_HALF_W + 0.6))));
        const lerpSeg = (frac): [number, number] => [segA[0] + (segB[0] - segA[0]) * frac, segA[1] + (segB[1] - segA[1]) * frac];
        if (c0 > 0.01) roadWall(segA, lerpSeg(c0), outwardNormal);
        if (c1 < 0.99) roadWall(lerpSeg(c1), segB, outwardNormal);
        continue;
      }
      roadWall(segA, segB, outwardNormal);
    }
  }
  if (apron.length) {
    const outer = apron[0].outer;
    for (let k = 0; k + 1 < outer.length; k++) roadWall(outer[k], outer[k + 1], outwardNormal, true);
  }
  return { levelRing, bankPieces, bankY, gatePts };
}

// ---------------- stair, river landing, Phước Duyên tower ----------------

function buildStairAndLanding(ctx) {
  const { data, S, courtY, box, cyl } = ctx;
  const street = streetTest(data, toWorld(0, 35), 60);
  const across = [-STAIR_HALF_W - 0.7, 0, STAIR_HALF_W + 0.7];
  let vEnd = 26.5;
  for (let v = FRONT_BROW_V + 10; v < 40; v += 0.1) if (across.some((u) => street(...toWorld(u, v), 0.3))) { vEnd = v; break; }
  let vKerb = 36;
  for (let v = vEnd + 1; v < 60; v += 0.1) if (![-8, -4, 0, 4, 8].some((u) => street(...toWorld(u, v), 'pavement'))) { vKerb = v; break; }

  const footG = LAND_Y + Math.max(0, rise(...toWorld(0, vEnd)));
  const stepCount = 30, landingLen = 1.8, stepRun = (vEnd - FRONT_BROW_V - landingLen) / stepCount, stepFall = (courtY - footG) / stepCount;
  const stairStart = S.n;
  S.kind = KIND.ROAD;
  let vCursor = FRONT_BROW_V;
  for (let k = 0; k < stepCount; k++) {
    if (k === stepCount / 2) {
      S.base = courtY - stepFall * k - LAND_Y;
      box(0, vCursor + landingLen / 2, footG - 0.8, courtY - stepFall * k, STAIR_HALF_W * 2, landingLen + 0.02, shade(COL.stone, 1.02), { topKind: KIND.ROAD });
      vCursor += landingLen;
    }
    const stepY = courtY - stepFall * (k + 1);
    S.base = stepY - LAND_Y;
    box(0, vCursor + stepRun / 2, footG - 0.8, stepY, STAIR_HALF_W * 2, stepRun + 0.02, k % 2 ? shade(COL.brick, 0.9) : shade(COL.brick, 0.95), { topKind: KIND.ROAD });
    vCursor += stepRun;
  }
  (S.paved = S.paved || []).push([stairStart, S.n]);

  S.kind = KIND.MASONRY; S.base = 0;
  for (const side of [-1, 1]) {
    const u = side * (STAIR_HALF_W + 0.3);
    const ptTop = toWorld(u, FRONT_BROW_V - 0.2), ptMid = toWorld(u, FRONT_BROW_V + (stepCount / 2) * stepRun + landingLen / 2), ptBot = toWorld(u, vEnd + 0.2);
    const midY = courtY - (stepFall * stepCount) / 2;
    S.beam([ptTop[0], courtY + 0.6, ptTop[1]], [ptMid[0], midY + 0.6, ptMid[1]], 0.6, 1.2, COL.lime);
    S.beam([ptMid[0], midY + 0.6, ptMid[1]], [ptBot[0], footG + 0.6, ptBot[1]], 0.6, 1.2, COL.lime);
    box(u, (FRONT_BROW_V + vEnd) / 2 + 0.1, LAND_Y - 0.4, Math.min(midY, courtY - 2), 0.6, vEnd - FRONT_BROW_V + 0.4, shade(COL.stone, 0.88));
    box(u, FRONT_BROW_V + (vEnd - FRONT_BROW_V) * 0.2, LAND_Y - 0.4, courtY - 2, 0.6, (vEnd - FRONT_BROW_V) * 0.4, shade(COL.stone, 0.88));
    box(u, vEnd - 0.2, footG, footG + 1.4, 0.8, 0.8, COL.lime);
    cyl(u, vEnd - 0.2, footG + 1.4, footG + 1.9, 0.3, 0.12, 6, COL.grey);
  }
  S.base = 0;

  // river landing (bến) across the road
  const vHead = Math.max(46, vKerb + 3);
  const landG = LAND_Y + Math.max(0, rise(...toWorld(0, (vKerb + vHead) / 2)));
  const landStart = S.n;
  S.kind = KIND.MASONRY;
  box(0, (vKerb + vHead) / 2, landG - 1.2, landG + 0.25, 16, vHead - vKerb, shade(COL.stone, 0.98), { topKind: KIND.ROAD });
  S.kind = KIND.ROAD;
  const landingSteps = 18, topY = landG + 0.25, botY = 0.4, run = 0.6;
  const isLand = landTest(data);
  const shoreStepIdx = Math.ceil(((topY - (LAND_Y - 0.9)) / (topY - botY)) * landingSteps) - 1;
  let vFlightStart = vHead;
  for (let v = vHead + shoreStepIdx * run; v < 90; v += 0.25) {
    if (![-5, 0, 5].some((u) => isLand(...toWorld(u, v)))) { vFlightStart = Math.max(vHead, v - shoreStepIdx * run); break; }
  }
  if (vFlightStart > vHead) box(0, (vHead + vFlightStart) / 2, landG - 1.2, topY, 10, vFlightStart - vHead + 0.1, shade(COL.stone, 0.98), { topKind: KIND.ROAD });
  for (let k = 0; k < landingSteps; k++) {
    box(0, vFlightStart + run * (k + 0.5), botY - 1.2, topY - ((topY - botY) * (k + 1)) / landingSteps, 10, run + 0.02, shade(COL.stone, 0.92 - k * 0.015), { topKind: KIND.ROAD });
  }
  (S.paved = S.paved || []).push([landStart, S.n]);
  S.kind = KIND.MASONRY;
  for (const side of [-1, 1]) {
    box(side * 6.5, (vHead + vFlightStart + landingSteps * run) / 2, botY - 1.2, topY + 0.5, 3.0, vFlightStart - vHead + landingSteps * run, shade(COL.stone, 0.9));
    box(side * 7.6, vKerb + 0.4, topY, topY + 0.8, 0.6, 0.6, COL.lime);
    cyl(side * 7.6, vKerb + 0.4, topY + 0.8, topY + 1.15, 0.28, 0.1, 6, COL.grey);
  }
  S.kind = KIND.PLAIN;
}

function buildPhuocDuyenTower(ctx) {
  const { S, courtY, lightBuf } = ctx;
  const rot = COMPOUND_ANG + Math.PI / 2 - Math.PI / 8;
  const plinthR = 7.4, plinthH = 0.9;
  S.base = courtY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], courtY - 0.2, courtY + plinthH, plinthR, plinthR * 0.98, 8, shade(COL.stone, 0.95), { rot });
  S.kind = KIND.PLAIN;
  S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], courtY + plinthH, courtY + plinthH + 0.06, plinthR * 0.99, plinthR * 0.99, 8, shade(COL.stone, 1.05), { rot });

  for (let k = 0; k < 8; k++) {
    const a0 = rot + (k / 8) * Math.PI * 2, a1 = rot + ((k + 1) / 8) * Math.PI * 2, aMid = (a0 + a1) / 2;
    const nx = Math.cos(aMid), nz = Math.sin(aMid);
    const axisDot = nx * -AXIS_UZ + nz * AXIS_UX;
    const railR = plinthR * 0.95;
    const ptA = [TOWER_CENTER[0] + Math.cos(a0) * railR, TOWER_CENTER[1] + Math.sin(a0) * railR];
    const ptB = [TOWER_CENTER[0] + Math.cos(a1) * railR, TOWER_CENTER[1] + Math.sin(a1) * railR];
    if (Math.abs(axisDot) > 0.9) {
      const mx = (ptA[0] + ptB[0]) / 2, mz = (ptA[1] + ptB[1]) / 2, faceAng = Math.atan2(ptB[1] - ptA[1], ptB[0] - ptA[0]);
      for (let step = 0; step < 4; step++) {
        const out = 0.35 + step * 0.34;
        S.box(mx + nx * out, mz + nz * out, courtY - 0.2, courtY + plinthH - ((step + 1) * plinthH) / 5, 3.4, 0.36, faceAng, COL.stone, { topKind: KIND.ROAD });
      }
      for (const frac of [0.18, 0.82]) {
        S.box(ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac, courtY + plinthH, courtY + plinthH + 0.9, 0.4, 0.4, faceAng, COL.lime);
      }
      continue;
    }
    S.beam([ptA[0], courtY + plinthH + 0.7, ptA[1]], [ptB[0], courtY + plinthH + 0.7, ptB[1]], 0.22, 0.14, COL.lime);
    S.beam([ptA[0], courtY + plinthH + 0.25, ptA[1]], [ptB[0], courtY + plinthH + 0.25, ptB[1]], 0.16, 0.1, COL.lime);
    S.box(ptA[0], ptA[1], courtY + plinthH, courtY + plinthH + 0.9, 0.36, 0.36, a0, COL.lime);
  }

  const baseR = 3.9, finialH = 2.5, bodyTotalH = TOWER_TOTAL_H - plinthH - finialH;
  const weights = Array.from({ length: TOWER_TIERS }, (_, i) => 1.3 - i * 0.08);
  const weightSum = weights.reduce((acc, val) => acc + val, 0);
  let curY = courtY + plinthH;
  for (let i = 0; i < TOWER_TIERS; i++) {
    const tierH = (bodyTotalH * weights[i]) / weightSum;
    const tierR = baseR * (1 - 0.07 * i), nextR = baseR * (1 - 0.07 * (i + 1));
    S.kind = KIND.MASONRY;
    S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY, curY + tierH - 0.45, tierR, tierR * 0.985, 8, COL.brick, { cap: false, rot });
    S.kind = KIND.PLAIN;
    S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY, curY + 0.24, tierR * 1.05, tierR * 1.05, 8, COL.trim, { cap: false, rot });
    S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY + tierH - 0.72, curY + tierH - 0.45, tierR * 1.04, tierR * 1.04, 8, COL.trim, { cap: false, rot });
    const apothem = tierR * Math.cos(Math.PI / 8);
    for (let k = 0; k < 8; k++) {
      const theta = rot + Math.PI / 8 + (k * Math.PI) / 4, nx = Math.cos(theta), nz = Math.sin(theta);
      const isDoor = Math.abs(nx * -AXIS_UZ + nz * AXIS_UX) > 0.9;
      const openW = isDoor ? Math.max(0.75, tierR * 0.32) : Math.max(0.5, tierR * 0.24);
      const topY = curY + tierH * (isDoor ? 0.6 : 0.55), botY = curY + (isDoor ? 0.24 : tierH * 0.2);
      S.box(TOWER_CENTER[0] + nx * (apothem + 0.02), TOWER_CENTER[1] + nz * (apothem + 0.02), botY - 0.1, topY + 0.18, 0.08, openW + 0.3, theta, COL.trim);
      S.box(TOWER_CENTER[0] + nx * (apothem + 0.07), TOWER_CENTER[1] + nz * (apothem + 0.07), botY, topY, 0.06, openW, theta, isDoor ? COL.dark : hex('#4a3a33'));
      S.box(TOWER_CENTER[0] + nx * (apothem + 0.07), TOWER_CENTER[1] + nz * (apothem + 0.07), topY, topY + openW * 0.28, 0.06, openW * 0.62, theta, isDoor ? COL.dark : hex('#4a3a33'));
      if (!isDoor) S.box(TOWER_CENTER[0] + nx * (apothem + 0.1), TOWER_CENTER[1] + nz * (apothem + 0.1), botY, botY + (topY - botY) * 0.55, 0.05, openW * 0.42, theta, COL.gold);
    }
    S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY + tierH - 0.45, curY + tierH - 0.28, tierR * 1.22, tierR * 1.22, 8, COL.eave, { rot });
    const lightY = curY + tierH - 0.5, lightR = tierR * 1.14;
    for (let k = 0; k < 8; k++) {
      const a0 = rot + (k / 8) * Math.PI * 2, a1 = rot + ((k + 1) / 8) * Math.PI * 2;
      lightBuf.beam([TOWER_CENTER[0] + Math.cos(a0) * lightR, lightY, TOWER_CENTER[1] + Math.sin(a0) * lightR], [TOWER_CENTER[0] + Math.cos(a1) * lightR, lightY, TOWER_CENTER[1] + Math.sin(a1) * lightR], 0.12, 0.09, [1, 1, 1]);
    }
    S.kind = KIND.TILE;
    S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY + tierH - 0.28, curY + tierH, tierR * 1.22, nextR * 1.03, 8, COL.eave, { cap: false, rot });
    curY += tierH;
  }
  S.kind = KIND.PLAIN;
  S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY, curY + 0.5, baseR * 0.48, baseR * 0.26, 8, COL.eave, { rot });
  S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY + 0.5, curY + 0.9, baseR * 0.14, baseR * 0.2, 8, COL.gold);
  S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY + 0.9, curY + 1.4, baseR * 0.2, baseR * 0.1, 8, COL.gold);
  S.cyl(TOWER_CENTER[0], TOWER_CENTER[1], curY + 1.4, curY + finialH, 0.12, 0.03, 6, COL.gold);
  S.base = 0;
}

// ---------------- forecourt, pavilions, Tam Quan, halls & stupa ----------------

function buildForecourtAndPavilions(ctx, gatePts) {
  const { S, courtY, box, cyl, lamp } = ctx;

  // forecourt paving, Hương Nguyện ruin, four trụ biểu pillars
  const paveStart = S.n;
  S.kind = KIND.ROAD;
  box(0, -4, courtY, courtY + 0.04, 26, 32, COL.pave, { topKind: KIND.ROAD });
  box(0, -48.5, courtY, courtY + 0.04, 3.2, 47, COL.pave, { topKind: KIND.ROAD });
  const sideRefV = (toLocal(SIDE_GATES[0][0], SIDE_GATES[0][1])[1] + toLocal(SIDE_GATES[1][0], SIDE_GATES[1][1])[1]) / 2;
  const sidePair = gatePts.filter((pt) => Math.abs(pt[1] - sideRefV) < 15);
  const [crossA, crossB] = sidePair.length === 2 ? sidePair : [toLocal(SIDE_GATES[0][0], SIDE_GATES[0][1]), toLocal(SIDE_GATES[1][0], SIDE_GATES[1][1])];
  const worldA = toWorld(crossA[0], crossA[1]), worldB = toWorld(crossB[0], crossB[1]);
  S.base = courtY - LAND_Y;
  S.box((worldA[0] + worldB[0]) / 2, (worldA[1] + worldB[1]) / 2, courtY, courtY + 0.04, Math.hypot(worldB[0] - worldA[0], worldB[1] - worldA[1]), 2.6, Math.atan2(worldB[1] - worldA[1], worldB[0] - worldA[0]), COL.pave, { topKind: KIND.ROAD });
  for (const side of [-1, 1]) box(side * 13.5, 4, courtY, courtY + 0.04, 7, 2.2, COL.pave, { topKind: KIND.ROAD });

  S.kind = KIND.MASONRY;
  box(0, 9.9, courtY, courtY + 0.35, 9.2, 3.4, shade(COL.stone, 0.86), { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const u of [-3.6, -1.2, 1.2, 3.6]) for (const v of [8.8, 11]) cyl(u, v, courtY + 0.35, courtY + 0.5, 0.32, 0.3, 6, shade(COL.stone, 0.95));
  (S.paved = S.paved || []).push([paveStart, S.n]);

  for (const u of [-7.4, -2.6, 2.6, 7.4]) {
    const pillarH = Math.abs(u) < 5 ? 7.4 : 6.4, v = FRONT_BROW_V - 1.1;
    S.base = courtY - LAND_Y;
    S.kind = KIND.MASONRY;
    box(u, v, courtY - 0.2, courtY + 0.9, 1.5, 1.5, COL.stone);
    box(u, v, courtY + 0.9, courtY + pillarH, 1.0, 1.0, COL.trim, { taper: 0.88 });
    S.kind = KIND.PLAIN;
    box(u, v, courtY + pillarH - 1.4, courtY + pillarH - 1.2, 1.12, 1.12, COL.grey);
    box(u, v, courtY + pillarH, courtY + pillarH + 0.32, 1.3, 1.3, COL.eave);
    cyl(u, v, courtY + pillarH + 0.32, courtY + pillarH + 1.1, 0.36, 0.05, 6, COL.trim);
    lamp(u, v + 0.8, courtY + pillarH - 0.7);
  }
  S.base = 0;

  // lawns & bonsai pots inside the gate
  const lawnStart = S.n;
  S.base = courtY - LAND_Y;
  S.kind = KIND.GROUND;
  const lawnCol = hex(PAL.green.grass);
  for (const [u0, u1] of [[-24, -2.4], [2.4, 26]]) for (const [v0, v1] of [[-66.5, -48.5], [-46, -28]]) {
    box((u0 + u1) / 2, (v0 + v1) / 2, courtY, courtY + 0.06, u1 - u0, v1 - v0, lawnCol, { topKind: KIND.GROUND });
  }
  (S.noCover = S.noCover || []).push([lawnStart, S.n]);
  S.kind = KIND.PLAIN;
  for (let v = -64; v <= -30; v += 4.25) {
    for (const side of [-1, 1]) {
      cyl(side * 2.3, v, courtY, courtY + 0.45, 0.42, 0.34, 8, hex('#8a5a44'));
      S.kind = KIND.TILE;
      cyl(side * 2.3, v, courtY + 0.45, courtY + 1.15, 0.55, 0.3, 6, hex('#4f6b3a'));
      S.kind = KIND.PLAIN;
    }
  }
  S.base = 0;

  // square houses of Thiệu Trị's steles
  for (const ring of STELE_HOUSES) {
    const rect = obb(ring), lc = toLocal(rect.c[0], rect.c[1]);
    const width = Math.max(rect.w, 3.6), y1 = courtY + 0.45, wallH = 2.7;
    S.base = courtY - LAND_Y;
    S.kind = KIND.MASONRY;
    box(lc[0], lc[1], courtY - 0.2, y1, width + 0.8, width + 0.8, COL.stone, { topKind: KIND.ROAD });
    for (const [du, dv, along] of ([[0, -width / 2, true], [0, width / 2, true], [-width / 2, 0, false], [width / 2, 0, false]] as [number, number, boolean][])) {
      for (const side of [-1, 1]) {
        const pu = du + (along ? side * width * 0.33 : 0), pv = dv + (along ? 0 : side * width * 0.33);
        box(lc[0] + pu, lc[1] + pv, y1, y1 + wallH, along ? width * 0.34 : 0.3, along ? 0.3 : width * 0.34, shade(COL.wall, 0.92));
      }
      box(lc[0] + du, lc[1] + dv, y1 + 2.0, y1 + wallH, along ? width * 0.34 : 0.3, along ? 0.3 : width * 0.34, shade(COL.wall, 0.92));
    }
    S.kind = KIND.PLAIN;
    box(lc[0], lc[1], y1, y1 + 0.3, 0.9, 0.5, COL.grey);
    box(lc[0], lc[1], y1 + 0.3, y1 + 2.2, 0.75, 0.16, hex('#5f5a52'));
    const centerWorld = toWorld(lc[0], lc[1]);
    S.kind = KIND.TILE;
    S.hip(centerWorld[0], centerWorld[1], width, width, COMPOUND_ANG, y1 + wallH, 1.7, COL.roof, { flare: 0.45, over: 0.7, fascia: 0.22, fasciaCol: shade(COL.roof, 0.7), hips: true, segs: 3, ridgeCol: COL.ridge });
    S.kind = KIND.PLAIN;
    S.cyl(centerWorld[0], centerWorld[1], y1 + wallH + 1.7, y1 + wallH + 2.3, 0.22, 0.05, 5, COL.gold);
    S.base = 0;
  }

  // two hexagonal pavilions: great bell (east) & turtle stele (west)
  for (const [u, v, hasBell] of ([[16.8, 0.7, true], [-19.0, -1.2, false]] as [number, number, boolean][])) {
    const radius = 2.6, colH = 4.2, y1 = courtY + 0.5;
    S.base = courtY - LAND_Y;
    S.kind = KIND.MASONRY;
    cyl(u, v, courtY - 0.2, y1, radius + 0.9, radius + 0.85, 6, COL.stone);
    S.kind = KIND.TIMBER;
    const center = toWorld(u, v);
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2 + COMPOUND_ANG, a1 = ((k + 1) / 6) * Math.PI * 2 + COMPOUND_ANG;
      const x = center[0] + Math.cos(a0) * radius, z = center[1] + Math.sin(a0) * radius;
      S.cyl(x, z, y1, y1 + 0.2, 0.3, 0.26, 6, shade(COL.stone, 0.95));
      S.cyl(x, z, y1 + 0.2, y1 + colH, 0.17, 0.15, 6, COL.lac, { cap: false });
      S.beam([x, y1 + colH - 0.15, z], [center[0] + Math.cos(a1) * radius, y1 + colH - 0.15, center[1] + Math.sin(a1) * radius], 0.24, 0.32, shade(COL.lac, 0.8));
    }
    S.kind = KIND.TILE;
    S.cyl(center[0], center[1], y1 + colH, y1 + colH + 0.9, radius + 1.1, radius * 0.62, 6, COL.roof, { rot: COMPOUND_ANG });
    S.cyl(center[0], center[1], y1 + colH + 0.9, y1 + colH + 2.4, radius * 0.62, 0.12, 6, COL.roof, { rot: COMPOUND_ANG, cap: false });
    S.kind = KIND.PLAIN;
    S.cyl(center[0], center[1], y1 + colH - 0.18, y1 + colH, radius + 1.1, radius + 1.1, 6, shade(COL.lac, 0.7), { rot: COMPOUND_ANG, cap: false });
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + COMPOUND_ANG, ca = Math.cos(ang), sa = Math.sin(ang);
      const r0 = radius * 0.6, r1 = radius + 1.1;
      S.beam([center[0] + ca * r0, y1 + colH + 0.95, center[1] + sa * r0], [center[0] + ca * r1, y1 + colH + 0.05, center[1] + sa * r1], 0.18, 0.2, COL.ridge);
      S.beam([center[0] + ca * r1, y1 + colH + 0.05, center[1] + sa * r1], [center[0] + ca * (r1 + 0.45), y1 + colH + 0.55, center[1] + sa * (r1 + 0.45)], 0.16, 0.18, COL.ridge);
    }
    S.cyl(center[0], center[1], y1 + colH + 2.4, y1 + colH + 3.1, 0.24, 0.05, 6, COL.gold);
    if (hasBell) {
      S.beam([center[0] - AXIS_UX * radius * 0.85, y1 + 3.4, center[1] - AXIS_UZ * radius * 0.85], [center[0] + AXIS_UX * radius * 0.85, y1 + 3.4, center[1] + AXIS_UZ * radius * 0.85], 0.3, 0.3, shade(COL.lac, 0.6));
      S.cyl(center[0], center[1], y1 + 0.5, y1 + 2.7, 0.72, 0.6, 10, COL.bronze);
      S.cyl(center[0], center[1], y1 + 2.7, y1 + 3.0, 0.6, 0.3, 10, COL.bronze);
      S.cyl(center[0], center[1], y1 + 3.0, y1 + 3.3, 0.14, 0.14, 6, COL.bronze);
      S.cyl(center[0], center[1], y1 + 0.5, y1 + 0.62, 0.76, 0.76, 10, shade(COL.bronze, 1.2), { cap: false });
    } else {
      S.kind = KIND.MASONRY;
      box(u, v, y1, y1 + 0.3, 2.6, 2.0, COL.grey);
      S.cyl(center[0], center[1], y1 + 0.3, y1 + 0.96, 1.05, 0.7, 8, hex('#7a776d'), { rot: COMPOUND_ANG });
      box(u, v + 1.15, y1 + 0.35, y1 + 0.8, 0.45, 0.6, hex('#7a776d'));
      box(u, v, y1 + 0.9, y1 + 3.5, 1.2, 0.25, hex('#86827a'));
      box(u, v, y1 + 3.5, y1 + 3.75, 1.3, 0.3, hex('#7a776d'));
    }
    S.base = 0;
  }
}

function buildTamQuanAndHalls(ctx) {
  const { S, courtY, box, cyl, beam, lamp } = ctx;

  // Tam Quan two-storey gate
  const gateV = -22.4, gateW = 11.2, gateD = 5.4, wallH = 4.4, y1 = courtY + 0.45;
  S.base = courtY - LAND_Y;
  S.kind = KIND.MASONRY;
  box(0, gateV, courtY - 0.2, y1, gateW + 1.6, gateD + 2.4, COL.stone, { topKind: KIND.ROAD });
  for (const side of [-1, 1]) {
    for (let step = 0; step < 3; step++) box(0, gateV + side * (gateD / 2 + 1.2 + 0.32 * (step + 0.5)), courtY - 0.2, y1 - (step + 1) * 0.12, 3.2, 0.33, shade(COL.stone, 1.03), { topKind: KIND.ROAD });
  }
  const piers = [[-5.6, -4.4], [-2.6, -1.2], [1.2, 2.6], [4.4, 5.6]];
  const doors = [[-4.4, -2.6, 3.0], [-1.2, 1.2, 3.6], [2.6, 4.4, 3.0]];
  for (const [u0, u1] of piers) box((u0 + u1) / 2, gateV, y1, y1 + wallH, u1 - u0, gateD, COL.wall, { top: shade(COL.roof, 0.8) });
  for (const [u0, u1, doorH] of doors) {
    box((u0 + u1) / 2, gateV, y1 + doorH, y1 + wallH, u1 - u0, gateD, COL.wall, { top: shade(COL.roof, 0.8) });
    for (const side of [-1, 1]) {
      box((u0 + u1) / 2, gateV + side * (gateD / 2 + 0.03), y1 + doorH - 0.05, y1 + doorH + 0.35, u1 - u0 + 0.3, 0.08, COL.trim);
      box((u0 + u1) / 2, gateV + side * (gateD / 2 + 0.03), y1 + doorH - 0.45, y1 + doorH - 0.05, (u1 - u0) * 0.5, 0.08, shade(COL.wall, 0.92));
    }
    S.kind = KIND.PLAIN;
    box((u0 + u1) / 2, gateV, y1 + doorH - 0.06, y1 + doorH, u1 - u0, gateD, shade(COL.wall, 0.45), { bottom: true });
    for (const side of [-1, 1]) {
      const guardU = side < 0 ? u0 + 0.3 : u1 - 0.3;
      for (const dv of [-1.2, 1.2]) {
        cyl(guardU, gateV + dv, y1, y1 + 0.3, 0.32, 0.32, 6, COL.grey);
        cyl(guardU, gateV + dv, y1 + 0.3, y1 + 1.7, 0.3, 0.24, 6, COL.lime);
        cyl(guardU, gateV + dv, y1 + 1.7, y1 + 2.05, 0.15, 0.14, 6, hex('#e3c9a6'));
      }
    }
    S.kind = KIND.MASONRY;
  }
  S.kind = KIND.TILE;
  const gateCenter = toWorld(0, gateV);
  S.hip(gateCenter[0], gateCenter[1], gateW, gateD, COMPOUND_ANG, y1 + wallH, 1.6, COL.roof, { flare: 0.5, over: 0.9, fascia: 0.26, fasciaCol: shade(COL.roof, 0.7), hips: true, segs: 3 });
  S.kind = KIND.TIMBER;
  const y2 = y1 + wallH + 0.6, upperH = 2.5;
  box(0, gateV, y2, y2 + upperH, 7.0, 3.4, shade(COL.wall, 0.96), { top: shade(COL.roof, 0.8) });
  S.kind = KIND.PLAIN;
  for (const side of [-1, 1]) {
    for (const u of [-2.2, 0, 2.2]) box(u, gateV + side * 1.72, y2 + 0.6, y2 + 1.9, u === 0 ? 1.2 : 0.8, 0.06, COL.lac);
    box(0, gateV + side * 1.74, y2 + 2.0, y2 + 2.4, 3.0, 0.06, hex('#3a3a3a'));
  }
  S.kind = KIND.TILE;
  S.hip(gateCenter[0], gateCenter[1], 7.0, 3.4, COMPOUND_ANG, y2 + upperH, 2.0, COL.roof, { flare: 0.55, over: 1.0, fascia: 0.26, fasciaCol: shade(COL.roof, 0.7), hips: true, segs: 3, ridgeCol: COL.ridge });
  S.kind = KIND.PLAIN;
  box(0, gateV, y2 + upperH + 2.1, y2 + upperH + 2.4, 0.9, 0.3, COL.ridge);
  cyl(0, gateV, y2 + upperH + 2.4, y2 + upperH + 2.9, 0.25, 0.25, 8, COL.gold);
  for (const u of [-1.6, 1.6]) lamp(u, gateV + gateD / 2 + 0.4, y1 + 3.4);
  S.base = 0;

  // guardian halls
  for (const ring of GUARD_HALLS) {
    const rect = obb(ring);
    S.base = courtY - LAND_Y;
    pavilion(S, rect.c[0], rect.c[1], rect.w, rect.d, rect.a, courtY, { tiers: 1, wallH: 3.2, roof: COL.roof, wall: COL.wall, over: 0.8, rh: 2.0, platform: 0.4, ridge: COL.ridge, steps: false, segs: 3 });
    S.base = 0;
  }

  // Đại Hùng Bảo Điện
  const dhRect = obb(DAIHUNG), dhLoc = toLocal(dhRect.c[0], dhRect.c[1]);
  const dhW = 29, dhFrontV = -72.3, frontD = 9, mainD = 16;
  S.base = courtY - LAND_Y;
  S.kind = KIND.MASONRY;
  box(dhLoc[0], dhFrontV - (frontD + mainD) / 2 - 0.6, courtY - 0.2, courtY + 0.7, dhW + 2.6, frontD + mainD + 2.2, COL.stone, { topKind: KIND.ROAD });
  S.kind = KIND.ROAD;
  for (let step = 0; step < 4; step++) box(dhLoc[0], dhFrontV + 0.5 + 0.34 * (step + 0.5), courtY - 0.2, courtY + 0.7 - (step + 1) * 0.175, 8, 0.35, shade(COL.stone, 1.03), { topKind: KIND.ROAD });
  const hallFloorY = courtY + 0.7;
  const frontWorld = toWorld(dhLoc[0], dhFrontV - 1.4 - frontD / 2);
  const mainWorld = toWorld(dhLoc[0], dhFrontV - 1.4 - frontD - mainD / 2);
  pavilion(S, mainWorld[0], mainWorld[1], dhW - 1, mainD, COMPOUND_ANG, hallFloorY, { tiers: 2, wallH: 4.4, roof: COL.roof, wall: COL.hall, over: 1.3, rh: 3.8, ridge: COL.ridge, colonnade: true, segs: 4 });
  pavilion(S, frontWorld[0], frontWorld[1], dhW, frontD, COMPOUND_ANG, hallFloorY, { tiers: 1, wallH: 3.6, roof: COL.roof, wall: COL.hall, over: 1.2, rh: 2.6, ridge: COL.ridge, colonnade: true, segs: 4 });
  S.kind = KIND.PLAIN;
  const ridgeY = hallFloorY + 3.6 + 2.6 + 0.4;
  cyl(dhLoc[0], dhFrontV - 1.4 - frontD / 2, ridgeY, ridgeY + 0.9, 0.42, 0.42, 10, COL.gold);
  for (const side of [-1, 1]) beam(dhLoc[0] + side * 1.2, dhFrontV - 1.4 - frontD / 2, ridgeY + 0.1, dhLoc[0] + side * 3.4, dhFrontV - 1.4 - frontD / 2, ridgeY + 0.5, 0.3, 0.4, shade(COL.ridge, 0.9));
  for (const u of [-6, -2, 2, 6]) lamp(dhLoc[0] + u, dhFrontV - 0.9, hallFloorY + 3.0);
  cyl(dhLoc[0], dhFrontV + 5, courtY, courtY + 0.7, 0.5, 0.4, 8, COL.grey);
  cyl(dhLoc[0], dhFrontV + 5, courtY + 0.7, courtY + 1.5, 0.75, 0.6, 8, COL.bronze);
  S.base = 0;

  // rear halls
  for (const ring of HALLS) {
    const rect = obb(ring), depth = Math.min(rect.d, 14);
    S.base = courtY - LAND_Y;
    pavilion(S, rect.c[0], rect.c[1], rect.w, depth, rect.a, courtY, { tiers: 1, wallH: 3.2, roof: COL.roof, wall: depth > 9 ? COL.hall : COL.wall, over: 1.0, rh: Math.min(3.4, depth * 0.28), platform: 0.45, ridge: COL.ridge, colonnade: depth >= 6, steps: false, segs: 3 });
    S.base = 0;
  }

  // Thích Đôn Hậu stupa
  const [stupaX, stupaZ] = STUPA_POS;
  S.base = courtY - LAND_Y;
  S.kind = KIND.MASONRY;
  S.cyl(stupaX, stupaZ, courtY - 0.2, courtY + 0.5, 3.0, 2.9, 8, COL.stone);
  S.cyl(stupaX, stupaZ, courtY + 0.5, courtY + 0.9, 2.3, 2.2, 8, shade(COL.stone, 1.05));
  let tierY = courtY + 0.9, tierR = 1.5;
  for (let i = 0; i < 3; i++) {
    const tierH = 1.5 - i * 0.25;
    S.cyl(stupaX, stupaZ, tierY, tierY + tierH, tierR, tierR * 0.97, 8, COL.lime);
    S.kind = KIND.PLAIN;
    S.cyl(stupaX, stupaZ, tierY + tierH, tierY + tierH + 0.2, tierR * 1.25, tierR * 1.25, 8, COL.grey);
    S.kind = KIND.MASONRY;
    tierY += tierH + 0.2;
    tierR *= 0.8;
  }
  S.kind = KIND.PLAIN;
  S.cyl(stupaX, stupaZ, tierY, tierY + 1.4, 0.4, 0.05, 8, COL.gold);
  S.base = 0;
}

function plantPagodaTrees(ctx, levelRing, bankPieces, bankY) {
  const { data, courtY, onStreet } = ctx;
  if (!Array.isArray(data.trees)) return;
  const trees = data.trees, nearCount = data.meta?.counts?.treesNear;
  const verge = streetTest(data, toWorld(20, 30), 40);
  for (let i = trees.length / 4 - 1; i >= 0; i--) {
    const x = trees[i * 4] / 10, z = trees[i * 4 + 1] / 10, [u, v] = toLocal(x, z);
    if (v < 18 || v > 40 || u < 8 || u > 45 || !verge(x, z, 'pavement')) continue;
    trees.splice(i * 4, 4);
    if (nearCount != null && i < nearCount) data.meta.counts.treesNear--;
  }
  const crossLoc = [toLocal(SIDE_GATES[0][0], SIDE_GATES[0][1]), toLocal(SIDE_GATES[1][0], SIDE_GATES[1][1])];
  const crossDist = (u, v) => {
    const ex = crossLoc[1][0] - crossLoc[0][0], ev = crossLoc[1][1] - crossLoc[0][1];
    return Math.abs((u - crossLoc[0][0]) * ev - (v - crossLoc[0][1]) * ex) / Math.hypot(ex, ev);
  };
  const clearZones = [[-27, 29, -101, -19], [-15, 15, -21, 13]];
  const inBank = (u, v) => bankPieces.some((piece) => piece.length > 2 && inRing(u, v, piece));
  let seedIdx = 0;
  for (let gu = -76; gu <= 62; gu += 5.2) {
    for (let gv = -292; gv <= 34; gv += 5.2) {
      const seed = (seedIdx++) * 7 + 3;
      const u = gu + (rand(seed, 1) - 0.5) * 3.8, v = gv + (rand(seed, 2) - 0.5) * 3.8;
      const [x, z] = toWorld(u, v), baseG = LAND_Y + rise(x, z);
      if (clearZones.some(([u0, u1, v0, v1]) => u > u0 && u < u1 && v > v0 && v < v1)) continue;
      if (Math.abs(u) < STAIR_HALF_W + 2 && v > FRONT_BROW_V - 2) continue;
      if (crossDist(u, v) < 3) continue;
      let canPlant = false;
      if (inRing(u, v, levelRing)) canPlant = courtY - baseG < 1.0;
      else if (inBank(u, v)) canPlant = bankY(u, v) - baseG < 3.0;
      if (!canPlant || onStreet(x, z, 1.5)) continue;
      const isPine = v < -185;
      trees.push(Math.round(x * 10), Math.round(z * 10), 10 + Math.floor(rand(seed, 3) * 6), isPine ? 3 : rand(seed, 4) < 0.35 ? 1 : 0);
    }
  }
}

export function build({ data, S, group, THREE }) {
  if (!data.hakhe) throw new Error('no Hà Khê terrace in the data');
  const hkRing = offStreets(data, unflat(data.hakhe.ring));
  const courtY = LAND_Y + data.hakhe.top / 10 + 0.06;
  const keepKind = S.kind;
  const lanPos = [], lanCol = [];
  const lightBuf = new Buf(1200);

  const ctx = {
    data, S, THREE, courtY, lightBuf,
    onStreet: streetTest(data, toWorld(0, -60), 260),
    box: (u, v, ya, yb, w, d, col, opt?) => { const pt = toWorld(u, v); S.box(pt[0], pt[1], ya, yb, w, d, COMPOUND_ANG, col, opt); },
    cyl: (u, v, ya, yb, r0, r1, segs, col, opt?) => { const pt = toWorld(u, v); S.cyl(pt[0], pt[1], ya, yb, r0, r1, segs, col, { rot: COMPOUND_ANG, ...opt }); },
    beam: (u0, v0, y0, u1, v1, y1, w, h, col?) => { const ptA = toWorld(u0, v0), ptB = toWorld(u1, v1); S.beam([ptA[0], y0, ptA[1]], [ptB[0], y1, ptB[1]], w, h, col); },
    lamp: (u, v, y?) => { const pt = toWorld(u, v); lanPos.push(pt[0], y, pt[1]); lanCol.push(...LANTERN_RGB); },
    ...makeWallBuilders(S, courtY),
  };

  const { levelRing, bankPieces, bankY, gatePts } = buildGroundAndWalls(ctx, hkRing);
  buildStairAndLanding(ctx);
  buildPhuocDuyenTower(ctx);
  buildForecourtAndPavilions(ctx, gatePts);
  buildTamQuanAndHalls(ctx);
  plantPagodaTrees(ctx, levelRing, bankPieces, bankY);

  S.kind = keepKind;
  if (group) {
    const stripMesh = new THREE.Mesh(lightBuf.geometry(), lightMaterial(0xffba52, 1.5));
    stripMesh.renderOrder = 19;
    stripMesh.userData.landmark = id;
    group.add(stripMesh);
    const pts = glowPoints(lanPos, lanCol, 6.5);
    pts.userData.glow = true;
    pts.userData.landmark = id;
    group.add(pts);
  }
  return null;
}
