import * as THREE from 'three';
import { Buf, KIND, hex, shade, mix, chunked, rand, pick } from './buf.ts';
import { cityMaterial, enc } from './materials.ts';
import { LAND_Y, PAL, quality } from '../config.ts';
import { rise } from './terrain.ts';
import { lodAdd } from './lod.ts';
import { SILVER, SILVER_DARK } from './city-buildings.ts';

const INFILL_STRIDE = 8;
const DECIMETRES_PER_METRE = 10;
const MILLIRADIANS_PER_RADIAN = 1000;
const LOD_DETAIL_DIST_M = 1600;
const LOD_HOUSE_DIST_M = 5200;

const WHITE = [1, 1, 1];
const WARM_IVORY = hex('#f3eee3');
const MAQUETTE_TERRACOTTA = ['#b85c42', '#c2664a', '#b0563d', '#c76e50'].map(hex);
const TRIM_CREAM = [0.97, 0.95, 0.91];
const TRIM_SHADOW = [0.82, 0.79, 0.74];
const GLASS_DARK = [0.22, 0.28, 0.34];
const GLASS_LIGHT = [0.38, 0.47, 0.55];
const ARCADE_SHADOW = [0.26, 0.23, 0.20];
const SHUTTER_SAGE = [0.34, 0.47, 0.41];
const RAIL_DARK = [0.36, 0.35, 0.33];
const PLINTH_STONE = [0.78, 0.74, 0.67];
const TIMBER_POST = [0.46, 0.31, 0.22];
const RIDGE_CAP_COL = [0.95, 0.92, 0.87];
const PARAPET_CREAM = [0.96, 0.94, 0.90];
const AWNING_COLS = ['#a6503c', '#3c6270', '#b89452', '#4a6e54', '#8e684c', '#cbb996'].map(hex);
const CORNER_OFFSETS = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;

// Ultra-lean 3D framed window bay (6 tris, or 10 with shutters — keeps 80k instanced houses 60fps!)
function addRecessedWindow(
  buf: Buf,
  cx: number,
  y0: number,
  y1: number,
  w: number,
  zFace: number,
  dir: number,
  withShutters: boolean,
) {
  const zIn = zFace + dir * 0.008;
  const zOut = zFace + dir * 0.044;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const nFace = [0, 0, dir];
  const lx0 = x0 - 0.025, lx1 = x1 + 0.025;
  if (dir > 0) {
    buf.quad([x0, y0, zIn], [x1, y0, zIn], [x1, y1, zIn], [x0, y1, zIn], GLASS_DARK, nFace);
    buf.quad([lx0, y1, zFace], [lx1, y1, zFace], [lx1, y1 + 0.022, zOut], [lx0, y1 + 0.022, zOut], TRIM_CREAM, [0, -0.4, 1]);
    buf.quad([lx0, y0, zFace], [lx1, y0, zFace], [lx1, y0 - 0.016, zOut], [lx0, y0 - 0.016, zOut], WHITE, [0, 0.8, 0.6]);
  } else {
    buf.quad([x1, y0, zIn], [x0, y0, zIn], [x0, y1, zIn], [x1, y1, zIn], GLASS_DARK, nFace);
    buf.quad([lx1, y1, zFace], [lx0, y1, zFace], [lx0, y1 + 0.022, zOut], [lx1, y1 + 0.022, zOut], TRIM_CREAM, [0, -0.4, -1]);
    buf.quad([lx1, y0, zFace], [lx0, y0, zFace], [lx0, y0 - 0.016, zOut], [lx1, y0 - 0.016, zOut], WHITE, [0, 0.8, -0.6]);
  }
  if (withShutters) {
    const sw = w * 0.30;
    const zS = zIn + dir * 0.012;
    if (dir > 0) {
      buf.quad([x0 - sw, y0, zS], [x0, y0, zS], [x0, y1, zS], [x0 - sw, y1, zS], SHUTTER_SAGE, nFace);
      buf.quad([x1, y0, zS], [x1 + sw, y0, zS], [x1 + sw, y1, zS], [x1, y1, zS], SHUTTER_SAGE, nFace);
    } else {
      buf.quad([x0, y0, zS], [x0 - sw, y0, zS], [x0 - sw, y1, zS], [x0, y1, zS], SHUTTER_SAGE, nFace);
      buf.quad([x1 + sw, y0, zS], [x1, y0, zS], [x1, y1, zS], [x1 + sw, y1, zS], SHUTTER_SAGE, nFace);
    }
  }
}

// Ultra-lean 3D framed side window bay (4 tris)
function addSideWindow(
  buf: Buf,
  cz: number,
  y0: number,
  y1: number,
  w: number,
  xFace: number,
  dir: number,
) {
  const xIn = xFace + dir * 0.008;
  const xOut = xFace + dir * 0.04;
  const z0 = cz - w / 2;
  const z1 = cz + w / 2;
  const lz0 = z0 - 0.022, lz1 = z1 + 0.022;
  const nFace = [dir, 0, 0];
  if (dir > 0) {
    buf.quad([xIn, y0, z1], [xIn, y0, z0], [xIn, y1, z0], [xIn, y1, z1], GLASS_DARK, nFace);
    buf.quad([xFace, y0, lz1], [xFace, y0, lz0], [xOut, y0 - 0.015, lz0], [xOut, y0 - 0.015, lz1], WHITE, [0.6, 0.8, 0]);
  } else {
    buf.quad([xIn, y0, z0], [xIn, y0, z1], [xIn, y1, z1], [xIn, y1, z0], GLASS_DARK, nFace);
    buf.quad([xFace, y0, lz0], [xFace, y0, lz1], [xOut, y0 - 0.015, lz1], [xOut, y0 - 0.015, lz0], WHITE, [-0.6, 0.8, 0]);
  }
}

// Archetype 1A: Low-rise 2-story Indochine / Huế Shophouse (h < 7.8m, ~96 tris)
function buildShophouseLowGeo() {
  const b = new Buf(120);
  b.kind = KIND.PLAIN;
  b.box(0, -0.06, 0, 0.48, 0.96, 0.84, 0, WHITE, { top: TRIM_SHADOW });
  b.quad([-0.36, 0.02, 0.368], [0.36, 0.02, 0.368], [0.36, 0.40, 0.368], [-0.36, 0.40, 0.368], ARCADE_SHADOW, [0, 0, 1]);
  for (const px of [-0.44, 0, 0.44]) {
    b.box(px, 0.46, 0, 0.47, 0.10, 0.09, 0, TRIM_CREAM);
  }
  b.box(0, 0.02, 0.46, 0.515, 1.04, 1.06, 0, TRIM_CREAM, { top: WHITE, bottom: true });
  b.box(0, 0, 0.515, 0.955, 0.96, 0.96, 0, WHITE, { top: [0.85, 0.83, 0.79], topKind: KIND.FLAT });
  b.box(0, 0, 0.945, 1.0, 1.05, 1.05, 0, TRIM_CREAM, { top: [0.88, 0.86, 0.82], topKind: KIND.FLAT, bottom: true });
  for (const wx of [-0.26, 0.26]) {
    addRecessedWindow(b, wx, 0.59, 0.87, 0.18, 0.48, 1, true);
    addRecessedWindow(b, wx, 0.59, 0.87, 0.18, -0.48, -1, false);
  }
  for (const sx of [-1, 1]) {
    for (const wz of [-0.22, 0.20]) addSideWindow(b, wz, 0.59, 0.87, 0.18, sx * 0.48, sx);
  }
  return b.geometry();
}

// Archetype 1B: Mid-rise 3–4 story Indochine / Huế Shophouse (h >= 7.8m, ~128 tris)
function buildShophouseTallGeo() {
  const b = new Buf(160);
  b.kind = KIND.PLAIN;
  b.box(0, -0.06, 0, 0.27, 0.96, 0.84, 0, WHITE, { top: TRIM_SHADOW });
  b.quad([-0.36, 0.015, 0.368], [0.36, 0.015, 0.368], [0.36, 0.22, 0.368], [-0.36, 0.22, 0.368], ARCADE_SHADOW, [0, 0, 1]);
  for (const px of [-0.44, 0, 0.44]) {
    b.box(px, 0.46, 0, 0.26, 0.10, 0.09, 0, TRIM_CREAM);
  }
  b.box(0, 0.02, 0.255, 0.29, 1.04, 1.06, 0, TRIM_CREAM, { top: WHITE, bottom: true });
  b.box(0, 0, 0.29, 0.96, 0.96, 0.96, 0, WHITE, { top: [0.85, 0.83, 0.79], topKind: KIND.FLAT });
  for (const cy of [0.51, 0.73]) {
    b.box(0, 0, cy, cy + 0.024, 1.03, 1.03, 0, TRIM_CREAM, { top: WHITE });
  }
  b.box(0, 0, 0.955, 1.0, 1.05, 1.05, 0, TRIM_CREAM, { top: [0.88, 0.86, 0.82], topKind: KIND.FLAT, bottom: true });
  for (const [y0, y1] of [[0.33, 0.47], [0.56, 0.70], [0.78, 0.92]]) {
    for (const wx of [-0.26, 0.26]) {
      addRecessedWindow(b, wx, y0, y1, 0.17, 0.48, 1, true);
      addRecessedWindow(b, wx, y0, y1, 0.17, -0.48, -1, false);
    }
    for (const sx of [-1, 1]) {
      for (const wz of [-0.22, 0.20]) addSideWindow(b, wz, y0, y1, 0.18, sx * 0.48, sx);
    }
  }
  return b.geometry();
}

// Archetype 2: Sculpted 3D Modern Huế Tube-House (Nhà Ống, ~108 tris)
function buildTubehouseGeo() {
  const b = new Buf(140);
  b.kind = KIND.PLAIN;
  b.box(0, -0.05, 0, 0.98, 0.96, 0.86, 0, WHITE, { top: [0.86, 0.84, 0.80], topKind: KIND.FLAT });
  b.box(-0.465, 0.02, 0, 1.0, 0.08, 1.02, 0, TRIM_CREAM, { top: WHITE });
  b.box(0.465, 0.02, 0, 1.0, 0.08, 1.02, 0, TRIM_CREAM, { top: WHITE });
  b.quad([-0.38, 0.02, 0.388], [0.38, 0.02, 0.388], [0.38, 0.26, 0.388], [-0.38, 0.26, 0.388], ARCADE_SHADOW, [0, 0, 1]);
  b.box(0, 0.44, 0.28, 0.32, 0.98, 0.24, 0, TRIM_CREAM, { top: WHITE, bottom: true });

  for (const fy of [0.32, 0.65]) {
    b.quad([-0.36, fy + 0.02, 0.388], [0.22, fy + 0.02, 0.388], [0.22, fy + 0.26, 0.388], [-0.36, fy + 0.26, 0.388], GLASS_DARK, [0, 0, 1]);
    b.box(0, 0.45, fy - 0.02, fy + 0.02, 0.96, 0.20, 0, TRIM_CREAM, { top: WHITE, bottom: true });
    b.quad([-0.39, fy + 0.02, 0.53], [0.27, fy + 0.02, 0.53], [0.27, fy + 0.11, 0.53], [-0.39, fy + 0.11, 0.53], RAIL_DARK, [0, 0, 1]);
  }
  for (const lx of [0.28, 0.36]) {
    b.box(lx, 0.48, 0.32, 0.96, 0.03, 0.08, 0, TRIM_SHADOW);
  }
  b.box(0, 0.03, 0.955, 1.0, 1.02, 1.06, 0, TRIM_CREAM, { top: [0.87, 0.85, 0.81], topKind: KIND.FLAT, bottom: true });
  for (const wx of [-0.22, 0.22]) {
    addRecessedWindow(b, wx, 0.38, 0.56, 0.18, -0.48, -1, false);
    addRecessedWindow(b, wx, 0.70, 0.88, 0.18, -0.48, -1, false);
  }
  for (const sx of [-1, 1]) {
    for (const wz of [-0.22, 0.18]) {
      addSideWindow(b, wz, 0.39, 0.57, 0.18, sx * 0.505, sx);
      addSideWindow(b, wz, 0.71, 0.89, 0.18, sx * 0.505, sx);
    }
  }
  return b.geometry();
}

// Archetype 3: Sculpted 3D Indochine Colonial Villa (~104 tris)
function buildVillaGeo() {
  const b = new Buf(130);
  b.kind = KIND.PLAIN;
  b.box(0, 0, 0, 0.08, 1.04, 1.04, 0, PLINTH_STONE, { top: TRIM_CREAM });
  b.box(0, 0, 0.08, 0.46, 0.80, 0.80, 0, WHITE);
  for (const px of [-0.46, 0.46]) {
    for (const pz of [-0.46, 0.46]) {
      b.box(px, pz, 0.08, 0.47, 0.09, 0.09, 0, TRIM_CREAM);
    }
  }
  b.box(0, 0, 0.45, 0.50, 1.05, 1.05, 0, TRIM_CREAM, { top: WHITE, bottom: true });
  b.box(0, 0, 0.50, 0.95, 0.94, 0.94, 0, WHITE, { top: [0.85, 0.83, 0.79], topKind: KIND.FLAT });
  b.box(0, 0, 0.94, 1.0, 1.05, 1.05, 0, TRIM_CREAM, { top: [0.88, 0.86, 0.82], topKind: KIND.FLAT, bottom: true });
  for (const wx of [-0.24, 0.24]) {
    addRecessedWindow(b, wx, 0.58, 0.86, 0.16, 0.47, 1, true);
    addRecessedWindow(b, wx, 0.58, 0.86, 0.16, -0.47, -1, true);
  }
  for (const sx of [-1, 1]) {
    for (const wz of [-0.22, 0.22]) addSideWindow(b, wz, 0.58, 0.86, 0.16, sx * 0.47, sx);
  }
  return b.geometry();
}

// Archetype 4: Sculpted 3D Traditional Huế Nhà Rường (~72 tris)
function buildNhaRuongGeo() {
  const b = new Buf(96);
  b.kind = KIND.PLAIN;
  b.box(0, 0, 0, 0.16, 1.04, 1.04, 0, PLINTH_STONE, { top: TRIM_SHADOW });
  b.box(0, 0, 0.16, 0.94, 0.76, 0.72, 0, WHITE, { top: TRIM_SHADOW });
  b.quad([-0.28, 0.16, 0.366], [0.28, 0.16, 0.366], [0.28, 0.74, 0.366], [-0.28, 0.74, 0.366], ARCADE_SHADOW, [0, 0, 1]);
  for (const px of [-0.44, 0.44]) {
    b.box(px, 0.44, 0.16, 0.95, 0.07, 0.07, 0, TIMBER_POST);
    b.box(px, -0.44, 0.16, 0.95, 0.07, 0.07, 0, TIMBER_POST);
  }
  b.box(0, 0, 0.91, 1.0, 0.98, 0.98, 0, TIMBER_POST, { top: TIMBER_POST, bottom: true });
  return b.geometry();
}

function buildInfillGeometries() {
  // Sculpted 3D Hip Roof with gentle flared lower eave skirt, crisp ivory fascia, 4 corner hip ribs & raised ridge cap
  const hipBuf = new Buf(76);
  hipBuf.kind = KIND.TILE;
  const eave = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
  const mid = [[-0.41, 0.26, -0.41], [0.41, 0.26, -0.41], [0.41, 0.26, 0.41], [-0.41, 0.26, 0.41]];
  const ridge0 = [-0.26, 1, 0];
  const ridge1 = [0.26, 1, 0];
  // Lower gently flared eave skirt (gives real curved/broken silhouette!)
  hipBuf.quad(eave[0], eave[1], mid[1], mid[0], WHITE, [0, 1.2, -1]);
  hipBuf.quad(eave[1], eave[2], mid[2], mid[1], WHITE, [1, 1.2, 0]);
  hipBuf.quad(eave[2], eave[3], mid[3], mid[2], WHITE, [0, 1.2, 1]);
  hipBuf.quad(eave[3], eave[0], mid[0], mid[3], WHITE, [-1, 1.2, 0]);
  // Upper steeper hip slopes
  hipBuf.quad(mid[0], mid[1], ridge1, ridge0, WHITE, [0, 0.85, -1]);
  hipBuf.quad(mid[2], mid[3], ridge0, ridge1, WHITE, [0, 0.85, 1]);
  hipBuf.tri(mid[1], mid[2], ridge1, WHITE, [1, 0.85, 0]);
  hipBuf.tri(mid[3], mid[0], ridge0, WHITE, [-1, 0.85, 0]);
  hipBuf.kind = KIND.PLAIN;
  // Crisp ivory ridge cap along the hip crest (keep lean for 80k instanced roofs)
  hipBuf.box(0, 0, 0.96, 1.12, 0.56, 0.085, 0, RIDGE_CAP_COL, { top: WHITE });
  const soffit = eave.map((pt) => [pt[0], -0.15, pt[2]]);
  const fasciaNormals = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    hipBuf.quad(soffit[i], soffit[next], eave[next], eave[i], TRIM_CREAM, fasciaNormals[i]);
  }
  hipBuf.quad(soffit[0], soffit[1], soffit[2], soffit[3], [0.58, 0.56, 0.53], [0, -1, 0]);

  // Sculpted 3D Gable Roof with deep eaves, ivory fascia & raised ridge cap
  const gableBuf = new Buf(44);
  gableBuf.kind = KIND.TILE;
  gableBuf.quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 1, 0], [-0.5, 1, 0], WHITE, [0, 1, -1]);
  gableBuf.quad([0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.5, 1, 0], [0.5, 1, 0], WHITE, [0, 1, 1]);
  gableBuf.kind = KIND.PLAIN;
  gableBuf.box(0, 0, 0.96, 1.12, 1.02, 0.085, 0, RIDGE_CAP_COL, { top: WHITE });
  gableBuf.quad([-0.5, -0.15, -0.5], [0.5, -0.15, -0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5], TRIM_CREAM, [0, 0, -1]);
  gableBuf.quad([-0.5, -0.15, 0.5], [0.5, -0.15, 0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], TRIM_CREAM, [0, 0, 1]);
  gableBuf.quad([-0.5, -0.15, -0.5], [0.5, -0.15, -0.5], [0.5, -0.15, 0.5], [-0.5, -0.15, 0.5], [0.58, 0.56, 0.53], [0, -1, 0]);

  // Signature Southeast Asian shophouse raised ivory party-wall gable parapets
  const endBuf = new Buf(32);
  endBuf.kind = KIND.PLAIN;
  const gw = 0.065;
  for (const sx of [-0.5, 0.5]) {
    const x0 = sx < 0 ? -0.52 : 0.52 - gw;
    const x1 = sx < 0 ? -0.52 + gw : 0.52;
    const outN = sx < 0 ? [-1, 0, 0] : [1, 0, 0];
    endBuf.tri([sx < 0 ? x0 : x1, -0.14, -0.52], [sx < 0 ? x0 : x1, -0.14, 0.52], [sx < 0 ? x0 : x1, 1.16, 0], WHITE, outN);
    endBuf.tri([sx < 0 ? x1 : x0, -0.14, -0.52], [sx < 0 ? x1 : x0, -0.14, 0.52], [sx < 0 ? x1 : x0, 1.16, 0], TRIM_SHADOW, [-outN[0], 0, 0]);
    endBuf.quad([x0, -0.14, -0.52], [x1, -0.14, -0.52], [x1, 1.16, 0], [x0, 1.16, 0], WHITE, [0, 1, -1]);
    endBuf.quad([x1, -0.14, 0.52], [x0, -0.14, 0.52], [x0, 1.16, 0], [x1, 1.16, 0], WHITE, [0, 1, 1]);
  }

  // Sculpted 3D flat-roof parapet terrace with overhanging stone coping + stair-bulkhead & louvered pergola
  const parapetBuf = new Buf(96);
  parapetBuf.kind = KIND.PLAIN;
  const rimT = 0.065;
  parapetBuf.box(0, -0.5 + rimT / 2, 0, 1, 1.02, rimT, 0, PARAPET_CREAM, { top: WHITE });
  parapetBuf.box(0, 0.5 - rimT / 2, 0, 1, 1.02, rimT, 0, PARAPET_CREAM, { top: WHITE });
  parapetBuf.box(-0.5 + rimT / 2, 0, 0, 1, rimT, 1.02 - rimT * 2, 0, PARAPET_CREAM, { top: WHITE });
  parapetBuf.box(0.5 - rimT / 2, 0, 0, 1, rimT, 1.02 - rimT * 2, 0, PARAPET_CREAM, { top: WHITE });
  // Compact rooftop stair-bulkhead pavilion at the rear of the terrace
  parapetBuf.box(-0.14, -0.16, 0, 2.6, 0.36, 0.34, 0, PARAPET_CREAM, { top: TRIM_SHADOW });
  parapetBuf.box(-0.14, -0.16, 2.6, 2.95, 0.42, 0.40, 0, WHITE, { top: WHITE });

  const tankBuf = new Buf(32);
  tankBuf.box(0, 0, 0, 0.7, 1.1, 1.1, 0, SILVER_DARK, { top: SILVER_DARK });
  tankBuf.cyl(0, 0, 0.7, 2.1, 0.58, 0.58, 6, SILVER);

  const slabBuf = new Buf(16);
  slabBuf.box(0, 0, 0, 1, 1, 1, 0, [0.88, 0.86, 0.82], { top: WHITE, bottom: true });

  // Plain hillside retaining foundation plinth (sides only, top sits flush at maxRise — never buried!)
  const plinthBuf = new Buf(12);
  plinthBuf.kind = KIND.PLAIN;
  plinthBuf.box(0, 0, 0, 1, 1, 1, 0, PLINTH_STONE, { top: PLINTH_STONE });

  return {
    shophouseLow: buildShophouseLowGeo(),
    shophouseTall: buildShophouseTallGeo(),
    tubehouse: buildTubehouseGeo(),
    villa: buildVillaGeo(),
    nharuong: buildNhaRuongGeo(),
    plinth: plinthBuf.geometry(),
    hip: hipBuf.geometry(),
    gable: gableBuf.geometry(),
    end: endBuf.geometry(),
    parapet: parapetBuf.geometry(),
    slab: slabBuf.geometry(),
    tank: tankBuf.geometry(),
  };
}

function collectInfillParts(records: number[], baseIdx: number, start: number, end: number, off: any) {
  const parts: any[] = [];
  for (let recIdx = start; recIdx < end; recIdx++) {
    const seedIdx = baseIdx + recIdx;
    const base = recIdx * INFILL_STRIDE;
    const x = records[base] / DECIMETRES_PER_METRE;
    const z = records[base + 1] / DECIMETRES_PER_METRE;
    const width = records[base + 2] / DECIMETRES_PER_METRE;
    const depth = records[base + 3] / DECIMETRES_PER_METRE;
    const ang = records[base + 4] / MILLIRADIANS_PER_RADIAN;
    const height = records[base + 5] / DECIMETRES_PER_METRE;
    const isMain = records[base + 6] === 1;
    if (off && off(x, z, width, depth, ang)) continue;

    const bits = records[base + 7];
    const side = bits & 3;
    const era = (bits >> 2) & 3; // 0 modern, 1 Indochine, 2 Nguyễn-period timber
    const roofFamily = (bits >> 4) & 7;
    const frontDir = side === 2 ? 0 : side === 1 ? -1 : 1;

    let wallCol: number[];
    let roofCol: number[];
    if (era === 1) {
      wallCol = shade(mix(pick(PAL.indochine, seedIdx, 31), WARM_IVORY, 0.25), 0.96 + rand(seedIdx, 32) * 0.08);
      roofCol = shade(mix(pick(PAL.indochineRoof, seedIdx, 34), pick(MAQUETTE_TERRACOTTA, seedIdx, 39), 0.55), 0.94 + rand(seedIdx, 35) * 0.12);
    } else if (era === 2) {
      wallCol = shade(pick(PAL.tradWall, seedIdx, 31), 0.92 + rand(seedIdx, 32) * 0.16);
      roofCol = shade(pick(PAL.tradRoof, seedIdx, 34), 0.90 + rand(seedIdx, 35) * 0.18);
    } else {
      const baseWall = rand(seedIdx, 30) < 0.65 ? pick(PAL.pastel, seedIdx, 31) : pick(PAL.walls, seedIdx, 31);
      wallCol = shade(mix(baseWall, WARM_IVORY, 0.42), 0.95 + rand(seedIdx, 32) * 0.10);
      const baseRoof = rand(seedIdx, 33) < 0.08 ? pick(PAL.metalRoof, seedIdx, 34) : pick(MAQUETTE_TERRACOTTA, seedIdx, 34);
      roofCol = shade(baseRoof, 0.92 + rand(seedIdx, 35) * 0.16);
    }
    if (roofFamily && era !== 2) {
      // Keep pitched roofs harmonized toward sunlit terracotta (avoid awkward dark blue-grey caps on shophouses)
      const famCol = roofFamily <= 2 ? pick(MAQUETTE_TERRACOTTA, seedIdx, 36) : pick(PAL.roofFamily[roofFamily], seedIdx, 36);
      roofCol = shade(famCol, 0.94 + rand(seedIdx, 35) * 0.10);
    }
    if ((bits & 128) && era !== 2) wallCol = shade(pick(PAL.whitewash, seedIdx, 31), 0.97 + rand(seedIdx, 32) * 0.05);

    if (era === 2) {
      parts.push({ i: seedIdx, x, z, w: width, d: depth, ang, h: height, wallCol, roofCol, salt: 0, main: isMain, front: 0, era, rc: roofFamily });
    } else if (frontDir !== 0 && depth > 9.5 && rand(seedIdx, 50) < 0.55) {
      const depthDirX = -Math.sin(ang);
      const depthDirZ = Math.cos(ang);
      const frontDepth = depth * (0.5 + rand(seedIdx, 51) * 0.14);
      const rearDepth = depth - frontDepth;
      const frontOff = frontDir * (depth / 2 - frontDepth / 2);
      const rearOff = -frontDir * (depth / 2 - rearDepth / 2);
      parts.push({ i: seedIdx, x: x + depthDirX * frontOff, z: z + depthDirZ * frontOff, w: width, d: frontDepth, ang, h: height, wallCol, roofCol, salt: 0, main: isMain, front: frontDir, era, rc: roofFamily });
      const rearHeight = Math.max(3.3, height - 3.4 * (rand(seedIdx, 53) < 0.7 ? 1 : 2));
      const rearWidth = width * (0.72 + rand(seedIdx, 54) * 0.28);
      parts.push({ i: seedIdx, x: x + depthDirX * rearOff, z: z + depthDirZ * rearOff, w: rearWidth, d: rearDepth, ang, h: rearHeight, wallCol: shade(wallCol, 0.95), roofCol: shade(roofCol, 0.92), salt: 7, main: isMain, front: 0, era, rc: roofFamily });
    } else {
      parts.push({ i: seedIdx, x, z, w: width, d: depth, ang, h: height, wallCol, roofCol, salt: 0, main: isMain, front: frontDir, era, rc: roofFamily });
    }
  }
  return parts;
}

export function infillPlanter(group: THREE.Group, off: any = null) {
  const geos = buildInfillGeometries();
  const bodyMat = cityMaterial();
  const roofMat = cityMaterial();
  const tankMat = cityMaterial();

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  const posVec = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  const colorTmp = new THREE.Color();
  let meshes: THREE.InstancedMesh[] = [];

  const composeMatrix = () => mat4.compose(posVec, quat, scaleVec).clone();

  function addInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, list: any[], layer: number, castShadow = true, isDetail = false) {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    for (let k = 0; k < list.length; k++) {
      mesh.setMatrixAt(k, list[k][0]);
      mesh.setColorAt(k, enc(list[k][1], colorTmp));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow && !quality.low;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    mesh.layers.set(layer);
    lodAdd(mesh, isDetail ? LOD_DETAIL_DIST_M : LOD_HOUSE_DIST_M, { lift: !isDetail });
    group.add(mesh);
    meshes.push(mesh);
  }

  function placeChunk(parts: any[], layer: number) {
    const shophousesLow: any[] = [];
    const shophousesTall: any[] = [];
    const tubehouses: any[] = [];
    const villas: any[] = [];
    const nharuongs: any[] = [];
    const plinths: any[] = [];
    const hips: any[] = [];
    const gables: any[] = [];
    const ends: any[] = [];
    const parapets: any[] = [];
    const trays: any[] = [];
    const extras: any[] = [];
    const tanks: any[] = [];

    for (const part of parts) {
      const { i, x, z, salt, era } = part;
      const { w: width, d: depth, ang } = part;
      let height = part.h;
      const roofFamily = era === 2 ? 0 : part.rc;
      // Tall narrow modern tube-houses (h >= 9.5) get crisp flat parapet terraces instead of awkward tall pyramid caps
      const flatRoof = (era === 0 && height >= 9.5 && Math.min(width, depth) < 7.5)
        ? true
        : roofFamily >= 3
          ? rand(i, 21 + salt) < (roofFamily === 3 ? 0.68 : 0.44)
          : roofFamily ? false : era === 0 && rand(i, 21 + salt) < 0.20;
      const isGable = era === 0 && !flatRoof && salt === 0 && rand(i, 60) < (part.main ? 0.88 : 0.5);
      if (flatRoof) height += 0.55;

      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      let minRise = rise(x, z);
      let maxRise = minRise;
      for (const [u, v] of CORNER_OFFSETS) {
        const cornerRise = rise(x + (cosA * u * width - sinA * v * depth) / 2, z + (sinA * u * width + cosA * v * depth) / 2);
        minRise = Math.min(minRise, cornerRise);
        maxRise = Math.max(maxRise, cornerRise);
      }
      const foundation = maxRise > minRise ? maxRise - minRise + 0.3 : 0;
      const baseY = LAND_Y + maxRise;

      if (foundation > 0) {
        quat.setFromAxisAngle(upAxis, -ang);
        posVec.set(x, LAND_Y + minRise - 0.3, z);
        scaleVec.set(width, foundation, depth);
        plinths.push([composeMatrix(), WHITE]);
      }

      // Orient the sculpted +z front facade toward the street when part.front === -1
      const bodyAng = part.front === -1 ? ang + Math.PI : ang;
      quat.setFromAxisAngle(upAxis, -bodyAng);
      posVec.set(x, baseY, z);
      scaleVec.set(width, height, depth);
      const bodyEntry = [composeMatrix(), part.wallCol];

      if (era === 2) {
        nharuongs.push(bodyEntry);
      } else if (era === 1 && width > 7.2 && depth > 6.5) {
        villas.push(bodyEntry);
      } else if (flatRoof || (era === 0 && height > 9.0 && rand(i, 66) < 0.62)) {
        tubehouses.push(bodyEntry);
      } else if (part.h >= 7.8) {
        shophousesTall.push(bodyEntry);
      } else {
        shophousesLow.push(bodyEntry);
      }

      quat.setFromAxisAngle(upAxis, -ang);
      if (isGable) {
        const roofH = Math.min(3.7, Math.max(1.4, depth * (0.24 + rand(i, 37) * 0.07)));
        posVec.set(x, baseY + height + 0.12, z);
        scaleVec.set(width + 0.28, roofH, depth + 1.3);
        gables.push([composeMatrix(), part.roofCol]);
        scaleVec.set(width, roofH, depth);
        ends.push([composeMatrix(), PARAPET_CREAM]);
      } else if (!flatRoof) {
        let roofW = width;
        let roofD = depth;
        if (roofD > roofW) { [roofW, roofD] = [roofD, roofW]; quat.setFromAxisAngle(upAxis, -(ang + Math.PI / 2)); }
        const roofH = Math.min(3.4, Math.max(1.15, roofD * (era === 2 ? 0.32 : 0.26 + rand(i, 37 + salt) * 0.08)));
        const overhang = era === 2 ? 2.5 : era === 1 ? 1.9 : 1.15;
        posVec.set(x, baseY + height + 0.02, z);
        scaleVec.set(roofW + overhang, roofH, roofD + overhang);
        hips.push([composeMatrix(), part.roofCol]);
      } else {
        // Sculpted 3D parapet terrace + stair bulkhead on flat roofs
        posVec.set(x, baseY + height, z);
        scaleVec.set(width, 0.55, depth);
        parapets.push([composeMatrix(), shade(part.wallCol, 1.03)]);
        if (roofFamily >= 3) {
          posVec.set(x, baseY + height + 0.02, z);
          scaleVec.set(width * 0.88, 0.08, depth * 0.88);
          trays.push([composeMatrix(), part.roofCol]);
        }
      }

      if (flatRoof && rand(i, 38 + salt) < 0.45) {
        const tankScale = 0.85 + rand(i, 41) * 0.3;
        const dx = (rand(i, 39) - 0.5) * width * 0.28;
        const dz = (rand(i, 40) - 0.5) * depth * 0.28;
        posVec.set(x + cosA * dx - sinA * dz, baseY + height, z + sinA * dx + cosA * dz);
        scaleVec.set(tankScale, tankScale, tankScale);
        tanks.push([composeMatrix(), WHITE]);
      }

      // Tailored street-level canvas awning on main-street shophouses
      if (salt === 0 && part.front && era === 0 && rand(i, 70) < (part.main ? 0.65 : 0.18)) {
        const frontX = -sinA * part.front;
        const frontZ = cosA * part.front;
        quat.setFromAxisAngle(upAxis, -ang);
        posVec.set(x + frontX * (depth / 2 + 0.68), LAND_Y + maxRise + 2.85, z + frontZ * (depth / 2 + 0.68));
        scaleVec.set(width * 0.86, 0.14, 1.35);
        extras.push([composeMatrix(), pick(AWNING_COLS, i, 71)]);
      }
    }

    addInstanced(geos.shophouseLow, bodyMat, shophousesLow, layer, true);
    addInstanced(geos.shophouseTall, bodyMat, shophousesTall, layer, true);
    addInstanced(geos.tubehouse, bodyMat, tubehouses, layer, true);
    addInstanced(geos.villa, bodyMat, villas, layer, true);
    addInstanced(geos.nharuong, bodyMat, nharuongs, layer, true);
    addInstanced(geos.plinth, bodyMat, plinths, layer, false);
    addInstanced(geos.hip, roofMat, hips, layer, false);
    addInstanced(geos.gable, roofMat, gables, layer, false);
    addInstanced(geos.end, roofMat, ends, layer, false);
    addInstanced(geos.parapet, roofMat, parapets, layer, false);
    addInstanced(geos.slab, roofMat, trays, layer, false);
    addInstanced(geos.slab, roofMat, extras, layer, false, true);
    addInstanced(geos.tank, tankMat, tanks, layer, false, true);
  }

  return (records: number[], nearCount?: number, baseIdx = 0) => {
    const list = records || [];
    const resolvedNear = nearCount ?? list.length / INFILL_STRIDE;
    meshes = [];
    for (const chunk of chunked(collectInfillParts(list, baseIdx, 0, resolvedNear, off))) placeChunk(chunk, 0);
    for (const chunk of chunked(collectInfillParts(list, baseIdx, resolvedNear, list.length / INFILL_STRIDE, off))) placeChunk(chunk, 1);
    return meshes;
  };
}
