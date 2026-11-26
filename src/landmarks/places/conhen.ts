import { KIND, hex, shade, inRing, ringTest, rand, signedArea } from '../../geo/buf.ts';
import { LAND_Y, roadWidth } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';
import { pavilion } from '../citadel.ts';
import { LANDINGS } from '../conhen-landings.ts';
import { makeGrid, setPieces, vacant, village, FREE, WOOD, KEEP, BUILT, MAPPED } from '../conhen-village.ts';
import { lamp, flushLamps } from '../enclosure.ts';

// Cồn Hến, the islet in the Hương River off Vỹ Dạ, as it stands in 2026. Sources: docs/places/conhen.md.
export const id = 'conhen';
export const dataReach = 880;

const SHORE = [
  [351, -1464], [358, -1716], [368, -1855], [382, -1966], [394, -2022], [406, -2059], [418, -2106], [429, -2170],
  [433, -2185], [439, -2187], [445, -2183], [449, -2165], [454, -2138], [477, -2034], [514, -1857], [557, -1637],
  [564, -1572], [574, -1506], [578, -1468], [578, -1455], [579, -1448], [583, -1363], [583, -1239], [579, -1180],
  [560, -1011], [551, -944], [546, -832], [540, -794], [532, -760], [514, -695], [506, -669], [493, -647],
  [463, -609], [440, -576], [434, -563], [430, -561], [428, -564], [429, -570], [438, -587], [442, -603],
  [445, -618], [443, -632], [436, -651], [421, -682], [411, -717], [392, -782], [385, -816], [382, -850],
  [387, -904], [384, -934], [381, -947], [378, -964], [376, -988], [377, -1059], [365, -1202],
];
const VILLAGE = [
  [377.5, -1883.6], [423.9, -1877.9], [411.3, -1718.1], [443.4, -1715.2], [441.7, -1687.4], [484.6, -1684.5],
  [493.8, -1661.8], [498.9, -1506.5], [567.4, -1501], [575.9, -1239.7], [539.6, -1243.7], [532.7, -1194.8],
  [571.1, -1187.4], [569.4, -1173.7], [562.5, -1129.4], [554.5, -1128.2], [543.6, -1083.3], [551.6, -1080.5],
  [529.3, -959.9], [527.5, -945.7], [550.9, -944.4], [545.7, -832.2], [540.2, -794.4], [531.9, -759.8],
  [514.2, -694.8], [506.1, -668.6], [493.4, -647.1], [454.3, -649.9], [436, -650.9], [420.8, -681.9],
  [411, -716.6], [392.1, -782.2], [384.9, -815.6], [382.4, -850.2], [387, -903.5], [384, -933.6],
  [380.5, -947], [377.7, -964.3], [376.1, -988], [404.4, -990], [403.9, -1050.9], [382.1, -1050.9],
  [389.5, -1061.1], [407.3, -1064.5], [405.6, -1078.7], [378.1, -1217.5], [369.5, -1314.8], [365.5, -1441.6],
  [362.6, -1684], [366.1, -1794.9],
];

const COLORS = {
  bankTop: hex('#8f7c5c'), bankWet: hex('#5f5545'), sand: hex('#b7a684'),
  concrete: hex('#a39e92'), concreteDark: hex('#7d786d'), shell: hex('#e4e0d4'),
  hull: hex('#4f3a2a'), hullBlue: hex('#3e5a6e'), deck: hex('#7d6247'), mat: hex('#b39463'), matDark: hex('#977a4e'), pole: hex('#6b5a44'),
  trunk: hex('#857560'), frond: hex('#567536'), frondDark: hex('#46632d'), culm: hex('#7f8a3c'), bambooLeaf: hex('#5f7a35'), bambooLeafDark: hex('#4c6a2e'),
  soil: hex('#87704f'), corn: hex('#8fa245'), cornDark: hex('#6d8a37'), veg: hex('#4f7a3a'), vegDark: hex('#3f6430'),
  roof: hex('#8a4a32'), roofPagoda: hex('#7c4a34'), ridge: hex('#d6cbb2'), ochre: hex('#cfa955'), yellow: hex('#dcb64e'), lime: hex('#ece6d6'),
  pave: hex('#b2aa98'), stone: hex('#9a948a'), red: hex('#9b2f22'), white: hex('#efebe2'), lotus: hex('#e8c9c0'), gold: hex('#d8b04a'),
};

const BANK_WIDTH = 4.5;
const WATER_Y = 0;
const groundY = (x, z) => LAND_Y + rise(x, z);

function buildBanksAndLandings(S, shoreNormals, shoreAt) {
  S.kind = KIND.GROUND;
  for (let i = 0; i < SHORE.length; i++) {
    const j = (i + 1) % SHORE.length;
    const ptA = SHORE[i], ptB = SHORE[j], normA = shoreNormals[i], normB = shoreNormals[j];
    const ya = groundY(ptA[0], ptA[1]), yb = groundY(ptB[0], ptB[1]);
    const stepOut = (pt, norm, frac): [number, number] => [pt[0] + norm[0] * BANK_WIDTH * frac, pt[1] + norm[1] * BANK_WIDTH * frac];
    const aMid = stepOut(ptA, normA, 0.45), bMid = stepOut(ptB, normB, 0.45);
    const aBot = stepOut(ptA, normA, 1), bBot = stepOut(ptB, normB, 1);
    const upNorm = [(normA[0] + normB[0]) * 0.4, 1, (normA[1] + normB[1]) * 0.4];
    S.quad([ptA[0], ya + 0.02, ptA[1]], [ptB[0], yb + 0.02, ptB[1]], [bMid[0], 1.0, bMid[1]], [aMid[0], 1.0, aMid[1]], COLORS.bankTop, upNorm);
    S.quad([aMid[0], 1.0, aMid[1]], [bMid[0], 1.0, bMid[1]], [bBot[0], WATER_Y - 0.5, bBot[1]], [aBot[0], WATER_Y - 0.5, aBot[1]], COLORS.bankWet, upNorm);
  }

  let boatIdx = 0;
  for (const [lx, lz, boatCount, hasShells] of LANDINGS) {
    const info = shoreAt(lx, lz), [px, pz] = info.p, [nx, nz] = info.n, [tx, tz] = info.t;
    const y0 = groundY(px, pz), ang = Math.atan2(nz, nx);
    S.kind = KIND.MASONRY;
    const steps = 8, run = BANK_WIDTH + 0.6;
    for (let k = 0; k < steps; k++) {
      const u = -0.6 + (run * (k + 0.5)) / steps;
      const topY = y0 - ((y0 - WATER_Y - 0.15) * (k + 1)) / steps;
      S.box(px + nx * u, pz + nz * u, WATER_Y - 0.6, topY, run / steps + 0.02, 2.4, ang, COLORS.concrete, { top: shade(COLORS.concrete, 1.06) });
    }
    for (const side of [-1, 1]) {
      const ptA = [px - nx * 0.6 + tx * side * 1.35, pz - nz * 0.6 + tz * side * 1.35];
      const ptB = [px + nx * run + tx * side * 1.35, pz + nz * run + tz * side * 1.35];
      S.beam([ptA[0], y0 + 0.3, ptA[1]], [ptB[0], WATER_Y + 0.25, ptB[1]], 0.3, 0.6, COLORS.concreteDark);
    }
    if (hasShells) {
      S.kind = KIND.PLAIN;
      const hx = px - nx * 4 + tx * 4.5, hz = pz - nz * 4 + tz * 4.5;
      S.cyl(hx, hz, groundY(hx, hz) - 0.1, groundY(hx, hz) + 0.9, 2.2, 0.5, 7, COLORS.shell);
      S.cyl(hx + tx * 2.6, hz + tz * 2.6, groundY(hx, hz) - 0.1, groundY(hx, hz) + 0.55, 1.5, 0.3, 6, shade(COLORS.shell, 0.94));
    }
    for (let k = 0; k < Number(boatCount); k++, boatIdx++) {
      const off = (k - (Number(boatCount) - 1) / 2) * 2.6, out = BANK_WIDTH + 4.6 + rand(boatIdx, 3) * 0.8;
      drawSampan(S, px + nx * out + tx * off, pz + nz * out + tz * off, ang + (rand(boatIdx, 4) - 0.5) * 0.25, boatIdx);
    }
    lamp(px - nx * 1.2 + tx * 1.8, y0 + 3.2, pz - nz * 1.2 + tz * 1.8, [1, 0.78, 0.45], 3);
  }

  for (const [x, z] of ([[586, -1340], [584, -1460], [575, -1560], [559, -1700], [545, -1760], [587, -1220], [576, -1160], [356, -1420], [360, -1640]] as any[])) {
    const info = shoreAt(x, z);
    const ang = Math.atan2(info.t[1], info.t[0]) + (rand(boatIdx, 5) < 0.5 ? 0 : Math.PI);
    drawSampan(S, info.p[0] + info.n[0] * (BANK_WIDTH + 3), info.p[1] + info.n[1] * (BANK_WIDTH + 3), ang, boatIdx++);
  }
}

function buildShrinesAndFields(S, shoreAt, shoreDist, nearRoad, nearHouse, reserved, inShore, inVillage) {
  S.kind = KIND.PLAIN;
  for (const [x, z] of ([[372, -1000], [579, -1350], [440, -598], [366, -1760], [470, -2020]] as any[])) {
    const info = shoreAt(x, z);
    const sx = info.p[0] - info.n[0] * 2.2, sz = info.p[1] - info.n[1] * 2.2;
    const y = groundY(sx, sz), ang = Math.atan2(info.t[1], info.t[0]);
    S.box(sx, sz, y, y + 0.35, 1.8, 1.6, ang, COLORS.stone);
    S.box(sx, sz, y + 0.35, y + 1.25, 0.45, 0.45, ang, COLORS.lime);
    S.box(sx, sz, y + 1.25, y + 2.1, 1.1, 0.9, ang, COLORS.yellow, { top: COLORS.red });
    S.box(sx - info.n[0] * 0.46, sz - info.n[1] * 0.46, y + 1.4, y + 1.95, 0.5, 0.04, ang, COLORS.red);
    S.hip(sx, sz, 1.1, 0.9, ang, y + 2.1, 0.55, COLORS.roof, { over: 0.25, flare: 0.4 });
    lamp(sx, y + 1.7, sz, [1, 0.55, 0.3], 2);
    reserved.push([sx - 1.5, sz - 1.5, sx + 1.5, sz + 1.5]);
  }

  S.kind = KIND.GROUND;
  const fieldsStart = S.n;
  let plotIdx = 0;
  for (let x = 380; x < 580; x += 9) {
    for (let z = -2180; z < -1480; z += 18) {
      const x1 = x + 8, z1 = z + 17, cx = x + 4, cz = z + 8.5;
      const samplePts = [[x, z], [x1, z], [x1, z1], [x, z1], [cx, cz]];
      if (!samplePts.every(([u, v]) => inShore(u, v) && !inVillage(u, v) && shoreDist(u, v) > 5)) continue;
      if (samplePts.some(([u, v]) => nearRoad(u, v, 1.5) || nearHouse(u, v, 2.5))) continue;
      if (nearHouse(cx, cz, 6)) continue;
      const cropRoll = rand(plotIdx++, 11), y = groundY(cx, cz);
      S.prism([[x, z], [x1, z], [x1, z1], [x, z1]], y - 0.2, y + 0.06, COLORS.soil, shade(COLORS.soil, 0.95 + rand(plotIdx, 12) * 0.1));
      if (cropRoll < 0.55) {
        const cornH = 1.3 + rand(plotIdx, 13) * 0.6;
        for (let u = x + 1.0; u < x1 - 0.5; u += 2.0) S.box(u, cz, y + 0.06, y + cornH, 1.2, 16, 0, COLORS.cornDark, { top: COLORS.corn });
      } else if (cropRoll < 0.85) {
        for (let v = z + 1.4; v < z1 - 0.8; v += 2.4) S.box(cx, v, y + 0.06, y + 0.35, 7, 1.4, 0, COLORS.vegDark, { top: COLORS.veg });
      }
      reserved.push([x, z, x1, z1]);
    }
  }
  (S.paved = S.paved || []).push([fieldsStart, S.n]);
  S.kind = KIND.PLAIN;
}

function populateIslandTrees(data, S, grid, shoreAt, shoreDist, inReserved, inShore, inVillage) {
  const isOpen = (x, z) => { const cell = grid.at(x, z); return cell === FREE || cell === WOOD || cell === KEEP; };
  let bankIdx = 0;
  for (let i = 0; i < SHORE.length; i++) {
    const ptA = SHORE[i], ptB = SHORE[(i + 1) % SHORE.length], edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    for (let s = 6; s < edgeLen - 4; s += 13 + rand(bankIdx, 21) * 14, bankIdx++) {
      const frac = s / edgeLen, sx = ptA[0] + (ptB[0] - ptA[0]) * frac, sz = ptA[1] + (ptB[1] - ptA[1]) * frac;
      const info = shoreAt(sx, sz), inset = 1.5 + rand(bankIdx, 22) * 3;
      const x = sx - info.n[0] * inset, z = sz - info.n[1] * inset;
      if (inReserved(x, z, 2) || !isOpen(x, z) || !isOpen(x + 1.5, z) || !isOpen(x - 1.5, z)) continue;
      const roll = rand(bankIdx, 23);
      if (roll < 0.42) drawPalm(S, x, z, info.n, bankIdx);
      else if (roll < 0.8) drawBamboo(S, x, z, bankIdx);
    }
  }

  if (!Array.isArray(data.trees)) return;
  const trees = data.trees;
  const pushTree = (x, z, scale, kind) => trees.push(Math.round(x * 10), Math.round(z * 10), Math.round(scale * 10), kind);
  const dirs8 = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
  const isSolid = (x, z) => { const cell = grid.at(x, z); return cell === BUILT || cell === MAPPED; };
  const fitCrown = (x, z, maxScale, minScale = 0.7) => {
    for (let sc = maxScale; sc >= minScale; sc -= 0.15) {
      const rad = 2.2 * sc;
      if (!isSolid(x, z) && dirs8.every(([u, v]) => !isSolid(x + u * rad, z + v * rad) && !isSolid(x + u * rad * 0.5, z + v * rad * 0.5))) return sc;
    }
    return 0;
  };

  let edgeIdx = 0;
  for (let i = 0; i < SHORE.length; i++) {
    const ptA = SHORE[i], ptB = SHORE[(i + 1) % SHORE.length], edgeLen = Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
    for (let s = 1; s < edgeLen; s += 4 + rand(edgeIdx, 61) * 1.8, edgeIdx++) {
      const frac = s / edgeLen, sx = ptA[0] + (ptB[0] - ptA[0]) * frac, sz = ptA[1] + (ptB[1] - ptA[1]) * frac;
      const info = shoreAt(sx, sz), inset = 0.6 + rand(edgeIdx, 62) * 1.2;
      const x = sx - info.n[0] * inset, z = sz - info.n[1] * inset;
      if (!inShore(x, z) || inReserved(x, z, 1.5) || !isOpen(x, z)) continue;
      const scale = fitCrown(x, z, 1.4 + rand(edgeIdx, 63) * 0.5, 0.9);
      if (scale) pushTree(x, z, scale, rand(edgeIdx, 64) < 0.4 ? 1 : 0);
    }
  }

  for (let x = 352; x < 584; x += 1.5) {
    for (let z = -2186; z < -560; z += 1.5) {
      const cell = grid.at(x, z), seed = Math.round(x * 7.3 + z * 13.1);
      if (cell !== WOOD && cell !== FREE && cell !== KEEP) continue;
      const prob = cell === WOOD ? 0.16 : cell === KEEP ? 0.05 : 0.07;
      if (rand(seed, 65) > prob) continue;
      const jx = x + (rand(seed, 66) - 0.5) * 1.4, jz = z + (rand(seed, 67) - 0.5) * 1.4;
      if (!inShore(jx, jz) || shoreDist(jx, jz) < 1.8 || !isOpen(jx, jz) || inReserved(jx, jz, 1)) continue;
      if (!inVillage(jx, jz) && cell === WOOD && shoreDist(jx, jz) > 14 && rand(seed, 68) < 0.85) continue;
      const scale = fitCrown(jx, jz, (cell === KEEP ? 0.7 : cell === WOOD ? 1.15 : 1.0) + rand(seed, 69) * 0.55, cell === FREE ? 0.6 : 0.7);
      if (scale) pushTree(jx, jz, scale, rand(seed, 70) < 0.45 ? 1 : 0);
    }
  }
}

export function build({ data, S }) {
  const winding = signedArea(SHORE) > 0 ? 1 : -1;
  const inShore = ringTest(SHORE);
  const inVillage = ringTest(VILLAGE);
  const shoreNormals = SHORE.map((pt, i) => {
    const prev = SHORE[(i + SHORE.length - 1) % SHORE.length], next = SHORE[(i + 1) % SHORE.length];
    let nx = 0, nz = 0;
    for (const [p0, p1] of ([[prev, pt], [pt, next]] as any[])) {
      const tx = p1[0] - p0[0], tz = p1[1] - p0[1], len = Math.hypot(tx, tz) || 1;
      nx += (tz * winding) / len;
      nz += (-tx * winding) / len;
    }
    const len = Math.hypot(nx, nz) || 1;
    return [nx / len, nz / len];
  });

  const shoreSegs = SHORE.map((ptA, i) => {
    const ptB = SHORE[(i + 1) % SHORE.length];
    const tx = ptB[0] - ptA[0], tz = ptB[1] - ptA[1], lenSq = tx * tx + tz * tz, len = Math.sqrt(lenSq) || 1;
    return { ax: ptA[0], az: ptA[1], tx, tz, invLenSq: 1 / (lenSq || 1), nx: (tz * winding) / len, nz: (-tx * winding) / len, ux: tx / len, uz: tz / len };
  });

  const shoreAt = (x, z) => {
    let bestSq = Infinity, bestPx = 0, bestPz = 0, bestSeg = shoreSegs[0];
    for (let i = 0; i < shoreSegs.length; i++) {
      const s = shoreSegs[i];
      let proj = ((x - s.ax) * s.tx + (z - s.az) * s.tz) * s.invLenSq;
      if (proj < 0) proj = 0; else if (proj > 1) proj = 1;
      const px = s.ax + s.tx * proj, pz = s.az + s.tz * proj;
      const dx = px - x, dz = pz - z, dSq = dx * dx + dz * dz;
      if (dSq < bestSq) { bestSq = dSq; bestPx = px; bestPz = pz; bestSeg = s; }
    }
    return { d: Math.sqrt(bestSq), p: [bestPx, bestPz], n: [bestSeg.nx, bestSeg.nz], t: [bestSeg.ux, bestSeg.uz] };
  };
  const shoreDist = (x, z) => {
    let bestSq = Infinity;
    for (let i = 0; i < shoreSegs.length; i++) {
      const s = shoreSegs[i];
      let proj = ((x - s.ax) * s.tx + (z - s.az) * s.tz) * s.invLenSq;
      if (proj < 0) proj = 0; else if (proj > 1) proj = 1;
      const dx = s.ax + s.tx * proj - x, dz = s.az + s.tz * proj - z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestSq) bestSq = dSq;
    }
    return Math.sqrt(bestSq);
  };

  buildBanksAndLandings(S, shoreNormals, shoreAt);

  const roads = [];
  for (const road of data.roads || []) {
    const pts = road[2];
    if (!pts) continue;
    let onIsland = false;
    for (let i = 0; i < pts.length; i += 2) {
      const rx = pts[i] / 10, rz = pts[i + 1] / 10;
      if (rx >= 350 && rx <= 585 && rz >= -2190 && rz <= -560 && inShore(rx, rz)) { onIsland = true; break; }
    }
    if (onIsland) roads.push({ w: roadWidth(road), pts });
  }
  const nearRoad = (x, z, margin) => roads.some(({ w, pts }) => {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i] / 10, az = pts[i + 1] / 10, bx = pts[i + 2] / 10, bz = pts[i + 3] / 10;
      const tx = bx - ax, tz = bz - az, lenSq = tx * tx + tz * tz || 1;
      const proj = Math.max(0, Math.min(1, ((x - ax) * tx + (z - az) * tz) / lenSq));
      if (Math.hypot(ax + tx * proj - x, az + tz * proj - z) < w / 2 + margin) return true;
    }
    return false;
  });
  const mapped = [];
  for (const bld of data.bld || []) {
    const flat = bld[0];
    const x0 = flat[0] / 10, z0 = flat[1] / 10;
    if (x0 < 330 || x0 > 610 || z0 < -2210 || z0 > -540) continue;
    const pts = [];
    let sx = 0, sz = 0;
    for (let i = 0; i < flat.length; i += 2) { const px = flat[i] / 10, pz = flat[i + 1] / 10; pts.push([px, pz]); sx += px; sz += pz; }
    const cx = sx / pts.length, cz = sz / pts.length;
    if (inShore(cx, cz)) mapped.push(pts);
  }
  const houses = mapped.map((pts) => {
    const cx = pts.reduce((sum, pt) => sum + pt[0], 0) / pts.length, cz = pts.reduce((sum, pt) => sum + pt[1], 0) / pts.length;
    return [cx, cz, Math.max(...pts.map((pt) => Math.hypot(pt[0] - cx, pt[1] - cz)))];
  });
  const nearHouse = (x, z, margin) => houses.some(([hx, hz, rad]) => Math.hypot(hx - x, hz - z) < rad + margin);
  const reserved = [];
  const inReserved = (x, z, margin = 0) => reserved.some(([x0, z0, x1, z1]) => x > x0 - margin && x < x1 + margin && z > z0 - margin && z < z1 + margin);

  buildChuaPhapHai(S, reserved);
  buildShrinesAndFields(S, shoreAt, shoreDist, nearRoad, nearHouse, reserved, inShore, inVillage);

  const grid = makeGrid({ shore: SHORE, village: VILLAGE, roads, mapped, reserved });
  setPieces(S, grid);
  vacant(S, grid);
  const built = village(S, grid, roads);

  const infill = data.infill || [];
  const sink = built.find(([, , frontage, depth]) => frontage > 5 && depth > 7);
  if (sink) {
    for (let i = 0; i + 7 < infill.length; i += 8) {
      const x = infill[i] / 10, z = infill[i + 1] / 10;
      if (x < 330 || x > 610 || z < -2200 || z > -540 || !inShore(x, z)) continue;
      infill[i] = Math.round(sink[0] * 10);
      infill[i + 1] = Math.round(sink[1] * 10);
      infill[i + 2] = infill[i + 3] = 1;
    }
  }

  populateIslandTrees(data, S, grid, shoreAt, shoreDist, inReserved, inShore, inVillage);
  flushLamps();
  S.kind = KIND.PLAIN;
  return null;
}

function drawSampan(S, x, z, ang, seed) {
  const len = 6.5 + rand(seed, 1) * 2, width = 1.15 + rand(seed, 2) * 0.35;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const localPt = (u, v): [number, number] => [x + u * ux - v * uz, z + u * uz + v * ux];
  const hull = [
    localPt(len / 2, 0), localPt(len * 0.3, width / 2), localPt(-len * 0.32, width / 2),
    localPt(-len / 2, 0.12), localPt(-len / 2, -0.12), localPt(-len * 0.32, -width / 2), localPt(len * 0.3, -width / 2),
  ];
  S.kind = KIND.TIMBER;
  S.prism(hull, WATER_Y - 0.25, WATER_Y + 0.42, rand(seed, 6) < 0.25 ? COLORS.hullBlue : COLORS.hull, COLORS.deck);
  S.kind = KIND.PLAIN;
  if (rand(seed, 7) < 0.5) {
    const u0 = -len * 0.22, u1 = len * 0.12, rad = width * 0.48;
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI, a1 = ((k + 1) / 4) * Math.PI, mid = (a0 + a1) / 2;
      const v0 = Math.cos(a0) * rad, v1 = Math.cos(a1) * rad;
      const y0 = WATER_Y + 0.42 + Math.sin(a0) * rad * 1.3, y1 = WATER_Y + 0.42 + Math.sin(a1) * rad * 1.3;
      const ptA = localPt(u0, v0), ptB = localPt(u1, v0), ptC = localPt(u1, v1), ptD = localPt(u0, v1);
      S.quad([ptA[0], y0, ptA[1]], [ptB[0], y0, ptB[1]], [ptC[0], y1, ptC[1]], [ptD[0], y1, ptD[1]], k % 2 ? COLORS.mat : COLORS.matDark, [-Math.sin(ang) * Math.cos(mid), Math.sin(mid), Math.cos(ang) * Math.cos(mid)]);
    }
  } else {
    const ptA = localPt(-len * 0.45, 0.25), ptB = localPt(len * 0.55, 0.3);
    S.beam([ptA[0], WATER_Y + 0.55, ptA[1]], [ptB[0], WATER_Y + 0.9, ptB[1]], 0.07, 0.07, COLORS.pole);
    const basket = localPt(-len * 0.3, -0.2);
    S.box(basket[0], basket[1], WATER_Y + 0.42, WATER_Y + 0.75, 0.8, 0.6, ang, COLORS.matDark);
  }
}

function drawPalm(S, x, z, outNorm, seed) {
  const height = 8 + rand(seed, 41) * 5, lean = 0.12 + rand(seed, 42) * 0.18, y0 = groundY(x, z);
  const pts = [];
  for (let k = 0; k <= 3; k++) {
    const frac = k / 3, offset = lean * height * frac * frac;
    pts.push([x + outNorm[0] * offset, y0 + height * frac, z + outNorm[1] * offset]);
  }
  for (let k = 0; k < 3; k++) S.beam(pts[k], pts[k + 1], 0.32 - k * 0.04, 0.32 - k * 0.04, COLORS.trunk);
  const top = pts[3], frondCount = 8, frondLen = 3.4 + rand(seed, 43);
  for (let k = 0; k < frondCount; k++) {
    const ang = (k / frondCount) * Math.PI * 2 + rand(seed, 44), dx = Math.cos(ang), dz = Math.sin(ang);
    const mid = [top[0] + dx * frondLen * 0.5, top[1] + 0.5, top[2] + dz * frondLen * 0.5];
    const tip = [top[0] + dx * frondLen, top[1] - 1.4, top[2] + dz * frondLen];
    const sx = -dz * 0.45, sz = dx * 0.45, col = k % 2 ? COLORS.frond : COLORS.frondDark;
    S.quad(top, [mid[0] + sx, mid[1], mid[2] + sz], tip, [mid[0] - sx, mid[1], mid[2] - sz], col, [0, 1, 0]);
    S.quad(top, [mid[0] - sx, mid[1], mid[2] - sz], tip, [mid[0] + sx, mid[1], mid[2] + sz], shade(col, 0.8), [0, -1, 0]);
  }
  S.cyl(top[0], top[2], top[1] - 0.6, top[1] + 0.1, 0.45, 0.3, 5, COLORS.frondDark);
}

function drawBamboo(S, x, z, seed) {
  const y0 = groundY(x, z), culmCount = 5 + Math.floor(rand(seed, 51) * 3), height = 7 + rand(seed, 52) * 4;
  for (let k = 0; k < culmCount; k++) {
    const ang = rand(seed * 31 + k, 53) * Math.PI * 2;
    const splay = 0.18 + rand(seed * 31 + k, 54) * 0.22;
    const culmH = height * (0.75 + rand(seed * 31 + k, 55) * 0.3);
    const bot = [x + Math.cos(ang) * 0.6, y0, z + Math.sin(ang) * 0.6];
    const top = [x + Math.cos(ang) * (0.6 + splay * culmH * 1.3), y0 + culmH * 0.95, z + Math.sin(ang) * (0.6 + splay * culmH * 1.3)];
    S.beam(bot, top, 0.11, 0.11, COLORS.culm);
  }
  for (let k = 0; k < 3; k++) {
    const ang = (k / 3) * Math.PI * 2 + rand(seed, 56), rad = 1.6 + rand(seed, 57) * 1.2;
    const cx = x + Math.cos(ang) * rad, cz = z + Math.sin(ang) * rad, y = y0 + height * (0.55 + rand(seed, 58 + k) * 0.25);
    S.cyl(cx, cz, y, y + height * 0.38, 2.0, 0.25, 5, k % 2 ? COLORS.bambooLeaf : COLORS.bambooLeafDark, { rot: ang });
  }
  S.cyl(x, z, y0 + height * 0.35, y0 + height * 0.9, 2.3, 0.6, 5, COLORS.bambooLeafDark);
}

function buildChuaPhapHai(S, reserved) {
  const ring = [[396.5, -1144.5], [446, -1140.5], [446, -1098], [402.5, -1098]];
  reserved.push([394, -1147, 448, -1096]);
  const zc = -1121, y = groundY(424, zc);
  const pavedStart = S.n;
  S.kind = KIND.GROUND;
  S.prism(ring, y - 0.3, y + 0.1, COLORS.stone, COLORS.pave, { topKind: KIND.ROAD });

  S.kind = KIND.MASONRY;
  for (let i = 0; i < 4; i++) {
    const ptA = ring[i], ptB = ring[(i + 1) % 4];
    const drawWallSeg = (p0, p1) => {
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      S.box((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, y, y + 1.6, len, 0.3, ang, COLORS.yellow, { top: COLORS.roofPagoda });
    };
    if (i === 3) {
      const lerp = (frac) => [ptA[0] + (ptB[0] - ptA[0]) * frac, ptA[1] + (ptB[1] - ptA[1]) * frac];
      const gapFrac = 5 / Math.hypot(ptB[0] - ptA[0], ptB[1] - ptA[1]);
      drawWallSeg(ptA, lerp(0.5 - gapFrac));
      drawWallSeg(lerp(0.5 + gapFrac), ptB);
    } else drawWallSeg(ptA, ptB);
  }

  const gateX = (ring[3][0] + ring[0][0]) / 2 + 0.7, gateZ = (ring[3][1] + ring[0][1]) / 2, gateAng = Math.PI / 2;
  S.kind = KIND.PLAIN;
  for (const offset of [-4.6, -1.6, 1.6, 4.6]) S.box(gateX, gateZ + offset, y, y + (Math.abs(offset) < 2 ? 4.4 : 3.4), 0.7, 0.7, 0, COLORS.yellow, { top: COLORS.lime });
  S.box(gateX, gateZ, y + 3.5, y + 4.4, 0.5, 3.6, 0, COLORS.yellow);
  S.hip(gateX, gateZ, 4.2, 1.4, gateAng, y + 4.4, 1.1, COLORS.roofPagoda, { over: 0.4, flare: 0.5, hips: true, ridgeCol: COLORS.ridge });
  for (const side of [-1, 1]) {
    S.box(gateX, gateZ + side * 3.1, y + 2.7, y + 3.4, 0.5, 2.4, 0, COLORS.yellow);
    S.hip(gateX, gateZ + side * 3.1, 3.0, 1.2, gateAng, y + 3.4, 0.8, COLORS.roofPagoda, { over: 0.3, flare: 0.5, hips: true });
  }

  const qx = 404, qz = -1136;
  S.kind = KIND.MASONRY;
  S.cyl(qx, qz, y, y + 1.2, 1.7, 1.6, 8, COLORS.stone);
  S.kind = KIND.PLAIN;
  S.cyl(qx, qz, y + 1.2, y + 1.9, 1.0, 1.4, 10, COLORS.lotus);
  S.cyl(qx, qz, y + 1.9, y + 4.6, 0.62, 0.34, 8, COLORS.white);
  S.cyl(qx, qz, y + 4.6, y + 5.15, 0.24, 0.2, 8, COLORS.white);
  S.cyl(qx, qz, y + 5.15, y + 5.4, 0.2, 0.05, 6, COLORS.white);

  pavilion(S, 424, zc, 13, 9.5, gateAng, y + 0.1, { tiers: 2, platform: 0.7, wallH: 3.4, roof: COLORS.roofPagoda, wall: COLORS.yellow, rh: 3.6, ridge: COLORS.ridge, colonnade: true, over: 1.3, segs: 3 });
  pavilion(S, 439.5, zc, 10, 6, gateAng, y + 0.1, { platform: 0.4, wallH: 3.0, roof: COLORS.roofPagoda, wall: COLORS.yellow, rh: 2.6, ridge: COLORS.ridge, over: 1.0 });
  (S.paved = S.paved || []).push([pavedStart, S.n]);
  lamp(gateX - 0.8, y + 3.2, gateZ - 2.4, [1, 0.75, 0.42], 4);
  lamp(gateX - 0.8, y + 3.2, gateZ + 2.4, [1, 0.75, 0.42], 4);
  lamp(qx + 1.8, y + 1.5, qz, [0.95, 0.9, 0.8], 5);
}
