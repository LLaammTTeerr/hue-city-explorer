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
const LOD_DETAIL_DIST_M = 1500;
const LOD_HOUSE_DIST_M = 5200;
const WHITE = [1, 1, 1];
const AWNING_COLS = ['#9c3a2c', '#2f5f73', '#b98a3a', '#3f6b4c', '#8a5a3a', '#c9b48a', '#6b3f4a'].map(hex);
const RAIL_COL = hex('#4a4744');
const CORNER_OFFSETS = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;

function buildInfillGeometries() {
  const wallBuf = new Buf(16);
  wallBuf.kind = KIND.FACADE;
  wallBuf.box(0, 0, 0, 1, 1, 1, 0, WHITE, { top: [0.72, 0.72, 0.72], topKind: KIND.FLAT });

  const hipBuf = new Buf(24);
  hipBuf.kind = KIND.TILE;
  const eave = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
  const ridge0 = [-0.28, 1, 0];
  const ridge1 = [0.28, 1, 0];
  hipBuf.quad(eave[0], eave[1], ridge1, ridge0, WHITE, [0, 1, -1]);
  hipBuf.quad(eave[2], eave[3], ridge0, ridge1, WHITE, [0, 1, 1]);
  hipBuf.tri(eave[1], eave[2], ridge1, WHITE, [1, 1, 0]);
  hipBuf.tri(eave[3], eave[0], ridge0, WHITE, [-1, 1, 0]);
  hipBuf.kind = KIND.PLAIN;
  const soffit = eave.map((pt) => [pt[0], -0.1, pt[2]]);
  const fasciaCol = [0.62, 0.62, 0.62];
  const fasciaNormals = [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]];
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    hipBuf.quad(soffit[i], soffit[next], eave[next], eave[i], fasciaCol, fasciaNormals[i]);
  }
  hipBuf.quad(soffit[0], soffit[1], soffit[2], soffit[3], [0.45, 0.45, 0.45], [0, -1, 0]);

  const gableBuf = new Buf(16);
  gableBuf.kind = KIND.TILE;
  gableBuf.quad([-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 1, 0], [-0.5, 1, 0], WHITE, [0, 1, -1]);
  gableBuf.quad([0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.5, 1, 0], [0.5, 1, 0], WHITE, [0, 1, 1]);
  gableBuf.kind = KIND.PLAIN;
  const gableFascia = [0.6, 0.6, 0.6];
  gableBuf.quad([-0.5, -0.12, -0.5], [0.5, -0.12, -0.5], [0.5, 0, -0.5], [-0.5, 0, -0.5], gableFascia, [0, 0, -1]);
  gableBuf.quad([-0.5, -0.12, 0.5], [0.5, -0.12, 0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], gableFascia, [0, 0, 1]);
  gableBuf.quad([-0.5, -0.12, -0.5], [0.5, -0.12, -0.5], [0.5, -0.12, 0.5], [-0.5, -0.12, 0.5], [0.42, 0.42, 0.42], [0, -1, 0]);

  const endBuf = new Buf(4); // the two gable walls under a gable roof
  endBuf.kind = KIND.PLAIN;
  endBuf.tri([-0.5, -0.12, -0.5], [-0.5, -0.12, 0.5], [-0.5, 1, 0], WHITE, [-1, 0, 0]);
  endBuf.tri([0.5, -0.12, -0.5], [0.5, -0.12, 0.5], [0.5, 1, 0], WHITE, [1, 0, 0]);

  const tankBuf = new Buf(32); // a lighter tank than the one on mapped buildings: there are thousands
  tankBuf.box(0, 0, 0, 0.7, 1.1, 1.1, 0, SILVER_DARK, { top: SILVER_DARK });
  tankBuf.cyl(0, 0, 0.7, 2.1, 0.58, 0.58, 6, SILVER);

  const slabBuf = new Buf(16); // awnings, balcony slabs, railings
  slabBuf.box(0, 0, 0, 1, 1, 1, 0, [0.82, 0.82, 0.82], { top: WHITE, bottom: true });

  return {
    wall: wallBuf.geometry(),
    hip: hipBuf.geometry(),
    gable: gableBuf.geometry(),
    end: endBuf.geometry(),
    slab: slabBuf.geometry(),
    tank: tankBuf.geometry(),
  };
}

function collectInfillParts(records: number[], baseIdx: number, start: number, end: number, off: any) {
  // break up the monotony of one box per plot: about half the houses get a lower rear wing
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
      wallCol = shade(pick(PAL.indochine, seedIdx, 31), 0.93 + rand(seedIdx, 32) * 0.12);
      roofCol = shade(pick(PAL.indochineRoof, seedIdx, 34), 0.9 + rand(seedIdx, 35) * 0.18);
    } else if (era === 2) {
      wallCol = shade(pick(PAL.tradWall, seedIdx, 31), 0.9 + rand(seedIdx, 32) * 0.2);
      roofCol = shade(pick(PAL.tradRoof, seedIdx, 34), 0.86 + rand(seedIdx, 35) * 0.26);
    } else {
      const baseWall = rand(seedIdx, 30) < 0.6 ? pick(PAL.pastel, seedIdx, 31) : mix(pick(PAL.walls, seedIdx, 31), [0.86, 0.8, 0.68], 0.08);
      wallCol = shade(baseWall, 0.9 + rand(seedIdx, 32) * 0.18);
      roofCol = shade(rand(seedIdx, 33) < 0.2 ? pick(PAL.metalRoof, seedIdx, 34) : pick(PAL.roofs, seedIdx, 34), 0.84 + rand(seedIdx, 35) * 0.28);
    }
    if (roofFamily && era !== 2) roofCol = shade(pick(PAL.roofFamily[roofFamily], seedIdx, 36), 0.92 + rand(seedIdx, 35) * 0.14);
    if ((bits & 128) && era !== 2) wallCol = shade(pick(PAL.whitewash, seedIdx, 31), 0.96 + rand(seedIdx, 32) * 0.06);

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
      parts.push({ i: seedIdx, x: x + depthDirX * rearOff, z: z + depthDirZ * rearOff, w: rearWidth, d: rearDepth, ang, h: rearHeight, wallCol: shade(wallCol, 0.95), roofCol: shade(roofCol, 0.92), salt: 7, main: isMain, era, rc: roofFamily });
    } else {
      parts.push({ i: seedIdx, x, z, w: width, d: depth, ang, h: height, wallCol, roofCol, salt: 0, main: isMain, front: frontDir, era, rc: roofFamily });
    }
  }
  return parts;
}

// Illustrated infill houses (instanced).
// Records arrive with the near-water ones first (layer 0, river reflection); the rest go on layer 1.
export function infillPlanter(group: THREE.Group, off: any = null) {
  const geos = buildInfillGeometries();
  const wallMat = cityMaterial({ windows: true, styled: true });
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
    const geom = geo === geos.wall ? geo.clone() : geo;
    if (geo === geos.wall) {
      geom.setAttribute('aBase', new THREE.InstancedBufferAttribute(Float32Array.from(list, (entry) => entry[2] || 0), 1));
      geom.setAttribute('aStyle', new THREE.InstancedBufferAttribute(Float32Array.from(list, (entry) => entry[3] || 0), 1));
    }
    const mesh = new THREE.InstancedMesh(geom, mat, list.length);
    for (let k = 0; k < list.length; k++) {
      mesh.setMatrixAt(k, list[k][0]);
      mesh.setColorAt(k, enc(list[k][1], colorTmp));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow && (!quality.low || geo === geos.wall);
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    mesh.layers.set(layer);
    lodAdd(mesh, isDetail ? LOD_DETAIL_DIST_M : LOD_HOUSE_DIST_M);
    group.add(mesh);
    meshes.push(mesh);
  }

  function placeChunk(parts: any[], layer: number) {
    const walls: any[] = [];
    const hips: any[] = [];
    const gables: any[] = [];
    const ends: any[] = [];
    const trays: any[] = [];
    const extras: any[] = [];
    const tanks: any[] = [];

    for (const part of parts) {
      const { i, x, z, salt, era } = part;
      const { w: width, d: depth, ang } = part;
      let height = part.h;
      const roofFamily = era === 2 ? 0 : part.rc;
      const flatRoof = roofFamily >= 3
        ? rand(i, 21 + salt) < (roofFamily === 3 ? 0.9 : 0.7)
        : roofFamily ? false : era === 0 && rand(i, 21 + salt) < 0.34;
      const isGable = era === 0 && !flatRoof && salt === 0 && rand(i, 60) < (part.main ? 0.88 : 0.5);
      const style = era === 2 ? KIND.TIMBER - 1 : era === 1 ? KIND.COLONIAL - 1 : height > 9.5 && width > 6.5 ? KIND.MODERN - 1 : 0;
      if (flatRoof) height += 0.7;

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
      const baseY = LAND_Y + minRise - (foundation ? 0.3 : 0);
      height += foundation;

      quat.setFromAxisAngle(upAxis, -ang);
      posVec.set(x, baseY, z);
      scaleVec.set(width, height, depth);
      walls.push([composeMatrix(), part.wallCol, maxRise, style]);

      if (isGable) {
        const roofH = Math.min(3.4, Math.max(1.2, depth * (0.2 + rand(i, 37) * 0.07)));
        posVec.set(x, baseY + height + 0.12, z);
        scaleVec.set(width + 0.24, roofH, depth + 1.1);
        gables.push([composeMatrix(), part.roofCol]);
        scaleVec.set(width, roofH, depth);
        ends.push([composeMatrix(), shade(part.wallCol, 0.97)]);
      } else if (!flatRoof) {
        let roofW = width;
        let roofD = depth;
        if (roofD > roofW) { [roofW, roofD] = [roofD, roofW]; quat.setFromAxisAngle(upAxis, -(ang + Math.PI / 2)); }
        const roofH = Math.min(3.2, Math.max(1.0, roofD * (era === 2 ? 0.3 : 0.24 + rand(i, 37 + salt) * 0.08)));
        const overhang = era === 2 ? 2.4 : era === 1 ? 1.8 : 0.9;
        posVec.set(x, baseY + height + 0.02, z);
        scaleVec.set(roofW + overhang, roofH, roofD + overhang);
        hips.push([composeMatrix(), part.roofCol]);
      } else if (roofFamily >= 3) {
        posVec.set(x, baseY + height + 0.01, z);
        scaleVec.set(width * 0.97, 0.1, depth * 0.97);
        trays.push([composeMatrix(), part.roofCol]);
      }

      if (flatRoof && rand(i, 38 + salt) < 0.6) {
        const tankScale = 0.85 + rand(i, 41) * 0.3;
        const dx = (rand(i, 39) - 0.5) * width * 0.3;
        const dz = (rand(i, 40) - 0.5) * depth * 0.3;
        posVec.set(x + cosA * dx - sinA * dz, baseY + height, z + sinA * dx + cosA * dz);
        scaleVec.set(tankScale, tankScale, tankScale);
        tanks.push([composeMatrix(), WHITE]);
      }

      if (salt === 0 && part.front && era === 0) {
        const frontX = -sinA * part.front;
        const frontZ = cosA * part.front;
        quat.setFromAxisAngle(upAxis, -ang);
        if (rand(i, 70) < (part.main ? 0.78 : 0.22)) {
          posVec.set(x + frontX * (depth / 2 + 0.7), LAND_Y + maxRise + 2.9, z + frontZ * (depth / 2 + 0.7));
          scaleVec.set(width * 0.94, 0.13, 1.5);
          extras.push([composeMatrix(), pick(AWNING_COLS, i, 71)]);
        }
        if (part.h >= 7 && rand(i, 72) < 0.5) {
          const balconyY = LAND_Y + maxRise + 3.42;
          posVec.set(x + frontX * (depth / 2 + 0.5), balconyY, z + frontZ * (depth / 2 + 0.5));
          scaleVec.set(width * 0.82, 0.14, 1.0);
          extras.push([composeMatrix(), shade(part.wallCol, 0.9)]);
          posVec.set(x + frontX * (depth / 2 + 0.96), balconyY + 0.14, z + frontZ * (depth / 2 + 0.96));
          scaleVec.set(width * 0.82, 0.86, 0.07);
          extras.push([composeMatrix(), RAIL_COL]);
        }
      }
    }

    addInstanced(geos.wall, wallMat, walls, layer);
    addInstanced(geos.hip, roofMat, hips, layer, false);
    addInstanced(geos.gable, roofMat, gables, layer, false);
    addInstanced(geos.end, roofMat, ends, layer, false);
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
