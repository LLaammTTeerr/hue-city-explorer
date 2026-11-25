import { KIND, hex, shade, mix, rand, inRing } from '../../geo/buf.ts';
import { LAND_Y, PAL } from '../../config.ts';
import { rise } from '../../geo/terrain.ts';

// ---- Núi Ngự Bình, the "royal screen": the flat-topped hill 4 km south of the Citadel, on its axis ----
//
// Sources (docs/places/ngubinh.md has the full list):
//  - vi.wikipedia.org/wiki/Núi_Ngự_Bình: 103 m (some sources 105 m), trapezoidal, symmetrical from the front, flat top
//    ("đỉnh bằng phẳng"); pines planted from Gia Long's reign; two small flanking hills, Tả Bật and Hữu Bật.
//  - OpenStreetMap: natural=peak ele=103 at 16.4418 N 107.59613 E (data/control-points.json); the pine wood
//    (way 588726451, natural=wood, needleleaved); the footpath up (way 631812146: along the west ridge to the top and
//    down the north face); the graveyards round the foot (ways 1180918090, 1180918092, ...; read here from data.green).
//  - tuoitre.vn "Giải cứu núi Ngự Bình" (2021): about 100,000 graves on 38.4 ha round the foot on all four sides; pine
//    forest replanted in 1976, thinned by seven fires in ten years (patchy cover, bare soil on the top and slopes).
//  - mia.vn travel guide: stone steps (bậc đá) on the climb; the top flat enough that people camp there.
// The terrain grid (25 m, scripts/build-data.mjs §9) already stands the hill at the right height (rise 101 m on a
// floor of about 3 m: 104 m) but peaks it on a single node. Here a local cap levels the crest into the flat top.
// The flat top's size and line follow the bare-earth DEM (FABDEM, data/raw/dem/terrain.json, ~30 m cells): ground over
// 85 m runs about 220 m from just east of the summit to the west-south-west (13° south of west), 50-60 m across, its
// highest points within about 6 m of each other; the grid agrees (93-97 m out to 200 m west). The sources give no size.
// Ground cover from the satellite (Google, 2026-11; reference only, outlines read by eye to ~5 m, nothing traced): the
// WSW crest is under closed pine; the open ground is a grassy glade round the summit and down the south face, where the
// path crosses it, and a second on the upper north-east slope, both with scattered young pines (OPEN_GLADES below).
// Estimated: the exact edge and the shoulder (a 28 m band on the terrain's ridge, at most 3 m proud), the glades' edges, path
// width, tomb sizes and colours. The data's trees on the cap and the glades are kept off by geo/city.js (paved) and
// drawn again here at the new ground's height. Tả Bật / Hữu Bật are not drawn: no source places them.

export const id = 'ngubinh';

const SUMMIT_ORIGIN = [774.2, 2997.7]; // the place's summit point, model metres; everything below is relative to it
// the flat top: a band of half-width CREST_HALF_W round the crest line CREST_LINE (north-east end at the summit, out to the west-south-
// west), SHOULDER_WIDTH the shoulder down to the hillside. The line follows the terrain's own ridge (the ridge of rise(): it bows
// 25-30 m south of the straight summit-to-west-end line over the middle), so the cap only levels the crest and lifts
// the ground at most MAX_LIFT anywhere (a soft limit, so the top never stands proud of the hillside as an embankment).
const CREST_LINE = [[22, -22], [0, 0], [-30, 24], [-80, 45], [-125, 48], [-150, 30], [-182, 25]];
const CREST_HALF_W = 14;
const SHOULDER_WIDTH = 26;
const MAX_LIFT = 3;
const GLADE_LIFT = 0.35; // the glades' grass is a skin this far above the terrain (the data's trees stand through it as before)
const CAP_GRID_STEP = 3;
const PATH_WIDTH = 2.7;
const PATH_STEP = 0.6;
const MAX_TOMBS = 1000;

// OSM way 631812146, relative metres: up the west ridge, over the top, down the north face (cut where the town starts).
// From (-26, 20) to (-22, -103) the way is re-framed onto the trodden line the satellite shows through the glade: OSM
// had it 10-15 m east and south of it over the summit (the rest of the way agrees with the imagery, or is under canopy).
const FOOTPATH_PTS = [
  [-340, 141], [-332, 80], [-256, 60], [-224, 47], [-184, 35], [-156, 27], [-143, 29], [-93, 49], [-26, 20],
  [-11.5, 8.5], [0, 0], [8.5, -11.5], [20, -26], [30, -40], [34.5, -57], [33, -67], [26, -77], [11.5, -86],
  [-11.5, -94.5], [-21.5, -103], [-22, -130], [-23, -154], [-22, -167], [-21, -177], [-14, -210], [-8, -224],
  [-8, -235], [-4, -244], [1, -249], [10, -254],
];

// the open glades the satellite shows, relative metres (rough outlines): round the summit and down the south face; the
// upper north-east slope. Everything else on the hill reads as closed pine wood.
const OPEN_GLADES = [
  [[-29, 14], [-37, -3], [-26, -17], [-3, -29], [17, -34], [37, -20], [57, -9], [60, 20], [54, 49], [49, 77], [29, 92], [0, 89], [-17, 66], [-26, 37]],
  [[-17, -121], [0, -123], [46, -109], [86, -112], [120, -115], [140, -103], [140, -80], [117, -63], [80, -60], [52, -63], [37, -75], [25, -86], [-14, -97]],
];

const COLORS = {
  grass: hex('#a2ad62'),
  grassAlt: hex('#96a75e'),
  worn: hex('#aaa077'),
  floor: hex(PAL.green.wood), // the terrain mesh's own wood colour, so the cap meets it without a seam
  dirt: hex('#a48d6a'),
  stone: hex('#9d978a'),
  stoneDark: hex('#8c877c'),
  compassGold: hex('#c8a858'),
  tombs: ['#d8d4ca', '#cfcabd', '#e2ddd0', '#bfbab0', '#d9cfae', '#c9d0d0', '#b5b0a5'].map(hex),
  headstone: hex('#6d6a66'),
};

function createTerrainModel() {
  const baseRise = (x, z) => rise(SUMMIT_ORIGIN[0] + x, SUMMIT_ORIGIN[1] + z);
  // the crest line's segments, with their running length
  const crestSegs = [];
  let crestTotalLen = 0;
  for (let i = 0; i + 1 < CREST_LINE.length; i++) {
    const [x0, z0] = CREST_LINE[i];
    const [x1, z1] = CREST_LINE[i + 1];
    const segLen = Math.hypot(x1 - x0, z1 - z0);
    crestSegs.push({ x0, z0, ux: (x1 - x0) / segLen, uz: (z1 - z0) / segLen, l: segLen, s0: crestTotalLen });
    crestTotalLen += segLen;
  }
  // relative point -> [s along the crest (clamped to it), distance from it]
  const crestAt = (x, z) => {
    let best: [number, number] = [0, Infinity];
    for (const seg of crestSegs) {
      const proj = Math.max(0, Math.min(seg.l, (x - seg.x0) * seg.ux + (z - seg.z0) * seg.uz));
      const dist = Math.hypot(x - seg.x0 - seg.ux * proj, z - seg.z0 - seg.uz * proj);
      if (dist < best[1]) best = [seg.s0 + proj, dist];
    }
    return best;
  };
  const distOutsideBand = (x, z, halfW = CREST_HALF_W) => crestAt(x, z)[1] - halfW;
  const pointAlongCrest = (dist) => {
    const seg = crestSegs.find((item) => dist <= item.s0 + item.l) || crestSegs[crestSegs.length - 1];
    const localS = Math.min(seg.l, dist - seg.s0);
    return [seg.x0 + seg.ux * localS, seg.z0 + seg.uz * localS, -seg.uz, seg.ux];
  };
  // the top's height along the crest: the ridge's highest ground across the band (within 8 m of the line), smoothed
  // over 40 m, so it is level across and eases gently along
  const sampleStep = 2;
  const rawProfile = [];
  for (let dist = 0; dist <= crestTotalLen + 0.01; dist += sampleStep) {
    const [x, z, nx, nz] = pointAlongCrest(dist);
    let maxRise = -Infinity;
    for (let offset = -8; offset <= 8; offset += 2) maxRise = Math.max(maxRise, baseRise(x + nx * offset, z + nz * offset));
    rawProfile.push(maxRise);
  }
  const smoothProfile = rawProfile.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let k = i - 10; k <= i + 10; k++) {
      if (k >= 0 && k < rawProfile.length) {
        sum += rawProfile[k];
        count++;
      }
    }
    return sum / count;
  });
  const topHeightAt = (dist) => {
    const idxFloat = Math.max(0, Math.min(smoothProfile.length - 1, dist / sampleStep));
    const idx = Math.min(smoothProfile.length - 2, Math.floor(idxFloat));
    return smoothProfile[idx] + (smoothProfile[idx + 1] - smoothProfile[idx]) * (idxFloat - idx) + 0.2;
  };
  // ground height (rise) with the cap: flat on top, a rounded shoulder down to the hillside over SHOULDER_WIDTH metres
  const capRise = (x, z) => {
    const [distAlong, distPerp] = crestAt(x, z);
    const shoulderDist = distPerp - CREST_HALF_W;
    const terrainR = baseRise(x, z);
    if (shoulderDist >= SHOULDER_WIDTH) return terrainR;
    const topH = topHeightAt(distAlong);
    const targetH = shoulderDist <= 0 ? topH : topH - (topH - terrainR) * (1 - Math.cos((Math.PI * shoulderDist) / SHOULDER_WIDTH)) / 2;
    return targetH > terrainR ? terrainR + MAX_LIFT * Math.tanh((targetH - terrainR) / MAX_LIFT) : terrainR;
  };
  const isInGlade = (x, z) => OPEN_GLADES.some((ring) => inRing(x, z, ring));
  const surfaceRise = (x, z) => {
    const capped = capRise(x, z);
    return isInGlade(x, z) ? Math.max(capped, baseRise(x, z) + GLADE_LIFT) : capped;
  };
  const surfaceY = (x, z) => LAND_Y + surfaceRise(x, z);
  return { baseRise, distOutsideBand, capRise, isInGlade, surfaceRise, surfaceY };
}

function buildSummitCapAndGlades(S, terrain) {
  const { baseRise, capRise, isInGlade, surfaceRise } = terrain;
  // ---- the flat top and the glades: one smooth-shaded 3 m grid, drawn only where it stands clear of the terrain ----
  S.kind = KIND.GROUND;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of CREST_LINE) {
    minX = Math.min(minX, x - CREST_HALF_W - SHOULDER_WIDTH);
    maxX = Math.max(maxX, x + CREST_HALF_W + SHOULDER_WIDTH);
    minZ = Math.min(minZ, z - CREST_HALF_W - SHOULDER_WIDTH);
    maxZ = Math.max(maxZ, z + CREST_HALF_W + SHOULDER_WIDTH);
  }
  for (const ring of OPEN_GLADES) {
    for (const [x, z] of ring) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  const gridX0 = Math.floor(minX / CAP_GRID_STEP) * CAP_GRID_STEP - CAP_GRID_STEP;
  const gridZ0 = Math.floor(minZ / CAP_GRID_STEP) * CAP_GRID_STEP - CAP_GRID_STEP;
  const countX = Math.ceil((maxX + CAP_GRID_STEP - gridX0) / CAP_GRID_STEP);
  const countZ = Math.ceil((maxZ + CAP_GRID_STEP - gridZ0) / CAP_GRID_STEP);
  const verts = [];
  for (let j = 0; j <= countZ; j++) {
    for (let i = 0; i <= countX; i++) {
      const x = gridX0 + i * CAP_GRID_STEP;
      const z = gridZ0 + j * CAP_GRID_STEP;
      const terrainR = baseRise(x, z);
      const surfH = surfaceRise(x, z);
      const cellHash = i * 7919 + j * 104729;
      const color = isInGlade(x, z)
        ? (rand(cellHash, 3) < 0.1 ? shade(COLORS.worn, 0.95 + rand(cellHash, 4) * 0.1) : mix(COLORS.grass, COLORS.grassAlt, rand(cellHash, 5)))
        : COLORS.floor;
      verts.push({ x: SUMMIT_ORIGIN[0] + x, z: SUMMIT_ORIGIN[1] + z, lift: surfH - terrainR, cap: capRise(x, z) - terrainR > 0.05, y: LAND_Y + (surfH - terrainR > 0.05 ? surfH : terrainR - 0.3), c: color });
    }
  }
  const vertAt = (i, j) => verts[Math.min(countZ, Math.max(0, j)) * (countX + 1) + Math.min(countX, Math.max(0, i))];
  for (let j = 0; j <= countZ; j++) {
    for (let i = 0; i <= countX; i++) { // normals from the grid's own heights
      const curr = vertAt(i, j);
      const east = vertAt(i + 1, j);
      const west = vertAt(i - 1, j);
      const north = vertAt(i, j + 1);
      const south = vertAt(i, j - 1);
      const sx = east.x - west.x;
      const sy = east.y - west.y;
      const sz = east.z - west.z;
      const tx = north.x - south.x;
      const ty = north.y - south.y;
      const tz = north.z - south.z;
      let nx = sy * tz - sz * ty;
      let ny = sz * tx - sx * tz;
      let nz = sx * ty - sy * tx;
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      curr.n = [nx, ny, nz];
    }
  }
  const addSmoothTri = (vA, vB, vC) => {
    let ptB = vB;
    let ptC = vC;
    if ((ptB.z - vA.z) * (ptC.x - vA.x) - (ptB.x - vA.x) * (ptC.z - vA.z) < 0) {
      const swap = ptB;
      ptB = ptC;
      ptC = swap;
    } // face up
    S.smoothTri([[vA.x, vA.y, vA.z], [ptB.x, ptB.y, ptB.z], [ptC.x, ptC.y, ptC.z]], [vA.n, ptB.n, ptC.n], [vA.c, ptB.c, ptC.c]);
  };
  const cellQuad = (i, j) => [vertAt(i, j), vertAt(i + 1, j), vertAt(i + 1, j + 1), vertAt(i, j + 1)];
  const capStart = S.n;
  const gladeQuads = [];
  for (let j = 0; j < countZ; j++) {
    for (let i = 0; i < countX; i++) {
      const cell = cellQuad(i, j);
      if (!cell.some((vert) => vert.lift > 0.05)) continue;
      if (!cell.some((vert) => vert.cap)) {
        gladeQuads.push(cell);
        continue;
      }
      addSmoothTri(cell[0], cell[1], cell[2]);
      addSmoothTri(cell[0], cell[2], cell[3]);
    }
  }
  (S.paved = S.paved || []).push([capStart, S.n]);
  for (const cell of gladeQuads) {
    addSmoothTri(cell[0], cell[1], cell[2]);
    addSmoothTri(cell[0], cell[2], cell[3]);
  }
  // ---- register the flat-cap lift so foliage.js plants real instanced pines cleanly on the levelled summit ----
  (S.stand = S.stand || []).push((worldX, worldZ) => {
    const x = worldX - SUMMIT_ORIGIN[0];
    const z = worldZ - SUMMIT_ORIGIN[1];
    if (x < gridX0 || x > maxX || z < gridZ0 || z > maxZ) return 0;
    return Math.max(0, surfaceRise(x, z) - baseRise(x, z));
  });
}

function buildFootpathAndSummitTerrace(S, terrain) {
  const { surfaceRise, surfaceY } = terrain;
  // ---- the footpath: trodden earth on the ridge, stone steps where it climbs steeply (the north face) ----
  S.kind = KIND.ROAD;
  const pathSamples = [];
  for (let i = 0; i + 1 < FOOTPATH_PTS.length; i++) {
    const [x0, z0] = FOOTPATH_PTS[i];
    const [x1, z1] = FOOTPATH_PTS[i + 1];
    const segLen = Math.hypot(x1 - x0, z1 - z0);
    const stepCount = Math.max(1, Math.round(segLen / PATH_STEP));
    const segAngle = Math.atan2(z1 - z0, x1 - x0);
    for (let k = 0; k < stepCount; k++) {
      const frac = (k + 0.5) / stepCount;
      const x = x0 + (x1 - x0) * frac;
      const z = z0 + (z1 - z0) * frac;
      const fracA = Math.max(0, frac - 1.5 / segLen);
      const fracB = Math.min(1, frac + 1.5 / segLen);
      const slope = Math.abs(surfaceRise(x0 + (x1 - x0) * fracB, z0 + (z1 - z0) * fracB) - surfaceRise(x0 + (x1 - x0) * fracA, z0 + (z1 - z0) * fracA)) / ((fracB - fracA) * segLen);
      const y = surfaceY(x, z);
      const isSteep = slope > 0.2;
      const seed = i * 1000 + k;
      const col = isSteep ? (rand(seed, 11) < 0.5 ? COLORS.stone : COLORS.stoneDark) : shade(COLORS.dirt, 0.95 + rand(seed, 13) * 0.1);
      S.box(SUMMIT_ORIGIN[0] + x, SUMMIT_ORIGIN[1] + z, y - 0.6, y + (isSteep ? 0.2 : 0.14), segLen / stepCount + 0.04, isSteep ? PATH_WIDTH - 0.2 : PATH_WIDTH, segAngle, col);
      if (k % 4 === 0) pathSamples.push([x, z]);
    }
  }

  // ---- summit viewing clearing: stone terrace, benches, stele & compass marker at the top where the path crosses ----
  const summitY = surfaceY(0, 0);
  S.kind = KIND.MASONRY;
  S.cyl(SUMMIT_ORIGIN[0], SUMMIT_ORIGIN[1], summitY - 0.5, summitY + 0.28, 5.4, 5.1, 16, COLORS.stone, { top: shade(COLORS.stone, 1.08), topKind: KIND.ROAD });
  S.cyl(SUMMIT_ORIGIN[0], SUMMIT_ORIGIN[1], summitY + 0.28, summitY + 0.42, 1.6, 1.4, 12, COLORS.stoneDark, { top: COLORS.compassGold });
  S.box(SUMMIT_ORIGIN[0] + 2.8, SUMMIT_ORIGIN[1] - 1.9, summitY + 0.26, summitY + 0.75, 1.4, 0.78, 0.4, COLORS.stoneDark);
  S.box(SUMMIT_ORIGIN[0] + 2.8, SUMMIT_ORIGIN[1] - 1.9, summitY + 0.75, summitY + 2.3, 0.96, 0.28, 0.4, COLORS.headstone);
  // 4 carved stone viewing benches facing the Citadel & Perfume River
  for (let k = 0; k < 4; k++) {
    const benchAngle = 0.4 + (k * Math.PI) / 2;
    const benchX = SUMMIT_ORIGIN[0] + Math.cos(benchAngle) * 4.2;
    const benchZ = SUMMIT_ORIGIN[1] + Math.sin(benchAngle) * 4.2;
    S.box(benchX, benchZ, summitY + 0.26, summitY + 0.66, 0.55, 1.75, benchAngle, COLORS.stoneDark);
    S.box(benchX, benchZ, summitY + 0.66, summitY + 0.78, 0.68, 1.9, benchAngle, shade(COLORS.stone, 1.08));
  }
  S.kind = KIND.PLAIN;
  return pathSamples;
}

function populatePineForest(data, terrain, pathSamples) {
  // ---- the closed pine wood: fill gaps inside OSM's wood ring with real instanced hill pines (kind 3) ----
  const woodRings = [];
  const graveRings = [];
  for (const [kind, rings] of data.green || []) {
    if (kind !== 'wood' && kind !== 'cemetery') continue;
    for (const flatRing of rings) {
      const ring = [];
      for (let i = 0; i < flatRing.length; i += 2) ring.push([flatRing[i] / 10 - SUMMIT_ORIGIN[0], flatRing[i + 1] / 10 - SUMMIT_ORIGIN[1]]);
      if (ring.some(([x, z]) => Math.hypot(x, z) < 300)) (kind === 'wood' ? woodRings : graveRings).push(ring);
    }
  }
  const occGrid = new Map();
  const cellKey = (x, z) => `${Math.floor(x / 6)},${Math.floor(z / 6)}`;
  const markOccupied = (x, z) => {
    const key = cellKey(x, z);
    if (!occGrid.has(key)) occGrid.set(key, []);
    occGrid.get(key).push([x, z]);
  };
  const isTaken = (x, z, minDist) => {
    const ci = Math.floor(x / 6);
    const cj = Math.floor(z / 6);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (const pt of occGrid.get(`${ci + di},${cj + dj}`) || []) {
          if (Math.hypot(pt[0] - x, pt[1] - z) < minDist) return true;
        }
      }
    }
    return false;
  };
  const existingTrees = data.trees || [];
  for (let i = 0; i < existingTrees.length; i += 4) {
    const x = existingTrees[i] / 10 - SUMMIT_ORIGIN[0];
    const z = existingTrees[i + 1] / 10 - SUMMIT_ORIGIN[1];
    if (Math.hypot(x, z) < 420) markOccupied(x, z);
  }
  if (!Array.isArray(data.trees)) return;
  const pineStep = 7.5;
  for (let z = -250; z <= 250; z += pineStep) {
    for (let x = -380; x <= 210; x += pineStep) {
      const seed = 900000 + Math.round(z / pineStep) * 1000 + Math.round(x / pineStep);
      const px = x + (rand(seed, 51) - 0.5) * 4;
      const pz = z + (rand(seed, 52) - 0.5) * 4;
      if (!woodRings.some((ring) => inRing(px, pz, ring)) || graveRings.some((ring) => inRing(px, pz, ring)) || terrain.isInGlade(px, pz)) continue;
      if (isTaken(px, pz, 5.5) || pathSamples.some((pt) => Math.hypot(pt[0] - px, pt[1] - pz) < 4.0) || Math.hypot(px, pz) < 6.5) continue;
      markOccupied(px, pz);
      const scale = 9 + Math.floor(rand(seed, 53) * 5); // 0.9..1.3 scale instanced pine
      data.trees.push(Math.round((SUMMIT_ORIGIN[0] + px) * 10), Math.round((SUMMIT_ORIGIN[1] + pz) * 10), scale, 3);
    }
  }
}

function buildHillsideGraves(data, S, terrain, pathSamples) {
  const { baseRise, distOutsideBand } = terrain;
  // ---- graves round the foot: the graveyards OSM maps on the slopes (data.green), thinned to what reads ----
  const withinRadius = (x, z, maxR) => Math.hypot(x, z) < maxR;
  const cemeteryRings = [];
  for (const [kind, rings] of data.green || []) {
    if (kind !== 'cemetery') continue;
    for (const flatRing of rings) {
      const ring = [];
      for (let i = 0; i < flatRing.length; i += 2) ring.push([flatRing[i] / 10 - SUMMIT_ORIGIN[0], flatRing[i + 1] / 10 - SUMMIT_ORIGIN[1]]);
      if (ring.some((pt) => withinRadius(pt[0], pt[1], 450))) cemeteryRings.push(ring);
    }
  }
  // things a tomb must keep off: trees' trunks, houses, mapped buildings, streets, the path
  const keepOff = [];
  const trees = data.trees || [];
  for (let i = 0; i < trees.length; i += 4) {
    const x = trees[i] / 10 - SUMMIT_ORIGIN[0];
    const z = trees[i + 1] / 10 - SUMMIT_ORIGIN[1];
    if (withinRadius(x, z, 470)) keepOff.push([x, z, 1.6]);
  }
  const infill = data.infill || [];
  for (let i = 0; i < infill.length; i += 8) {
    const x = infill[i] / 10 - SUMMIT_ORIGIN[0];
    const z = infill[i + 1] / 10 - SUMMIT_ORIGIN[1];
    if (withinRadius(x, z, 470)) keepOff.push([x, z, Math.max(infill[i + 2], infill[i + 3]) / 20 + 1.5]);
  }
  for (const bld of data.bld || []) {
    const flatPoly = bld[0];
    const center = [0, 0];
    for (let i = 0; i < flatPoly.length; i += 2) {
      center[0] += flatPoly[i] / 10 / (flatPoly.length / 2);
      center[1] += flatPoly[i + 1] / 10 / (flatPoly.length / 2);
    }
    let radius = 0;
    for (let i = 0; i < flatPoly.length; i += 2) radius = Math.max(radius, Math.hypot(flatPoly[i] / 10 - center[0], flatPoly[i + 1] / 10 - center[1]));
    if (withinRadius(center[0] - SUMMIT_ORIGIN[0], center[1] - SUMMIT_ORIGIN[1], 500)) keepOff.push([center[0] - SUMMIT_ORIGIN[0], center[1] - SUMMIT_ORIGIN[1], radius + 1.5]);
  }
  for (const pt of pathSamples) keepOff.push([pt[0], pt[1], 2.6]);
  const roadSegs = [];
  for (const [, , flatRoad] of data.roads || []) {
    for (let i = 0; i + 3 < flatRoad.length; i += 2) {
      const ptA = [flatRoad[i] / 10 - SUMMIT_ORIGIN[0], flatRoad[i + 1] / 10 - SUMMIT_ORIGIN[1]];
      const ptB = [flatRoad[i + 2] / 10 - SUMMIT_ORIGIN[0], flatRoad[i + 3] / 10 - SUMMIT_ORIGIN[1]];
      if (withinRadius(ptA[0], ptA[1], 600) || withinRadius(ptB[0], ptB[1], 600)) roadSegs.push([ptA, ptB]);
    }
  }
  const distToSeg = (pt, [ptA, ptB]) => {
    const dx = ptB[0] - ptA[0];
    const dz = ptB[1] - ptA[1];
    const lenSq = dx * dx + dz * dz || 1;
    const proj = Math.max(0, Math.min(1, ((pt[0] - ptA[0]) * dx + (pt[1] - ptA[1]) * dz) / lenSq));
    return Math.hypot(pt[0] - ptA[0] - dx * proj, pt[1] - ptA[1] - dz * proj);
  };
  // a hashed grid so the tests stay cheap
  const cellKey = (x, z) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
  const grid = new Map();
  const insertObstacle = (obs) => {
    const key = cellKey(obs[0], obs[1]);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(obs);
  };
  keepOff.forEach(insertObstacle);
  const hasClash = (x, z, radius) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const obs of grid.get(`${Math.floor(x / 8) + dx},${Math.floor(z / 8) + dz}`) || []) {
          if (Math.hypot(obs[0] - x, obs[1] - z) < obs[2] + radius) return true;
        }
      }
    }
    return false;
  };
  S.kind = KIND.MASONRY;
  let placed = 0;
  for (let k = 0; k < 9000 && placed < MAX_TOMBS; k++) {
    const x = (rand(k, 21) - 0.5) * 900;
    const z = (rand(k, 22) - 0.5) * 900;
    if (!withinRadius(x, z, 440) || distOutsideBand(x, z) < SHOULDER_WIDTH + 4) continue;
    if (!cemeteryRings.some((ring) => inRing(x, z, ring))) continue;
    if (hasClash(x, z, 1.6)) continue;
    if (roadSegs.some((seg) => distToSeg([x, z], seg) < 5)) continue;
    // head uphill, feet down the slope, as on the hillside graves
    const gradX = baseRise(x + 2, z) - baseRise(x - 2, z);
    const gradZ = baseRise(x, z + 2) - baseRise(x, z - 2);
    const angle = Math.hypot(gradX, gradZ) > 0.05 ? Math.atan2(gradZ, gradX) : rand(k, 23) * 6.28;
    const isFamilyTomb = rand(k, 24) < 0.18;
    const tombW = isFamilyTomb ? 4.2 + rand(k, 25) * 1.6 : 2.2 + rand(k, 26) * 0.4;
    const tombD = isFamilyTomb ? 3.2 + rand(k, 27) * 1.2 : 1.3 + rand(k, 28) * 0.2;
    const y = LAND_Y + baseRise(x, z);
    const col = COLORS.tombs[Math.floor(rand(k, 29) * COLORS.tombs.length)];
    const worldX = SUMMIT_ORIGIN[0] + x;
    const worldZ = SUMMIT_ORIGIN[1] + z;
    const cosAng = Math.cos(angle);
    const sinAng = Math.sin(angle);
    if (isFamilyTomb) {
      S.box(worldX, worldZ, y - 0.5, y + 0.45, tombW, tombD, angle, col, { top: shade(col, 0.9) }); // the plot's kerb, read as one block
      S.box(worldX - cosAng * 0.3, worldZ - sinAng * 0.3, y + 0.45, y + 0.85, tombW * 0.55, tombD * 0.55, angle, shade(col, 1.05), { taper: 0.8 });
    } else {
      S.box(worldX, worldZ, y - 0.5, y + 0.55, tombW, tombD, angle, col, { taper: 0.9 });
    }
    // the headstone (bia) at the uphill end
    S.box(worldX + cosAng * (tombW / 2 - 0.15), worldZ + sinAng * (tombW / 2 - 0.15), y, y + (isFamilyTomb ? 1.5 : 1.05), 0.22, isFamilyTomb ? 1.2 : 0.75, angle, rand(k, 30) < 0.5 ? COLORS.headstone : shade(col, 0.85));
    insertObstacle([x, z, isFamilyTomb ? 2.8 : 1.4]);
    placed++;
  }
}

export function build({ data, S }) {
  const keepKind = S.kind;
  const terrain = createTerrainModel();

  buildSummitCapAndGlades(S, terrain);
  const pathSamples = buildFootpathAndSummitTerrace(S, terrain);
  populatePineForest(data, terrain, pathSamples);
  buildHillsideGraves(data, S, terrain, pathSamples);

  S.kind = keepKind;
}
