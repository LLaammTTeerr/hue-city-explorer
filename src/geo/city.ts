import * as THREE from 'three';
import { Buf, KIND, hex, unflat, obb, ringCentre } from './buf.ts';
import { CellGrid } from './cellgrid.ts';
import { cityMaterial, landMaterial } from './materials.ts';
import { initDistricts } from './districts.ts';
import { LAND_Y, WALL_H, PAL } from '../config.ts';
import polygonClipping from 'polygon-clipping';
import { gateAxis, rectRing, inRing, CITADEL_PASSAGE } from './gates.ts';
import { initTerrain, buildTerrainMesh, rise } from './terrain.ts';
import { treePlanter } from './foliage.ts';
import { lodUpdate } from './lod.ts';
import { replaced } from '../landmarks/places/index.ts';
import { asphaltTest } from './junctions.ts';
import { buildRoads, overlayMaterial, inClearing, clearingsOf, type ClearingBox } from './city-roads.ts';
import { buildBuildings } from './city-buildings.ts';
import { infillPlanter } from './city-infill.ts';

const DECIMETRES_PER_METRE = 10;
const DEFAULT_LOD_REACH_M = 1500;
const STRUCTURES_BUF_INITIAL = 160000;
const GREEN_BUF_INITIAL = 20000;
const ROOF_CLASH_GRID_M = 40;
const COVER_SUBSAMPLES = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]] as const;
const TREE_RING_8 = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]] as const;
const TREE_RING_16 = Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)] as const);
const CROWN_SAMPLE_RADII = [0.41, 0.71, 0.91] as const;

export const CROWN_ROAD = 0.35; // the share of a tree's crown that may hang over the asphalt

export function updateDetail(camera: THREE.PerspectiveCamera, reach = DEFAULT_LOD_REACH_M) {
  lodUpdate(camera, reach / DEFAULT_LOD_REACH_M);
}

// ---------- land & diorama plinth ----------
function buildLand(data: any, group: THREE.Group) {
  const topMat = landMaterial(PAL.land, true);
  const sideMat = landMaterial(PAL.bank, false, true);
  for (const poly of data.land) {
    const rings = poly.map(unflat);
    const shape = new THREE.Shape(rings[0].map((pt: number[]) => new THREE.Vector2(pt[0], pt[1])));
    for (let i = 1; i < rings.length; i++) {
      shape.holes.push(new THREE.Path(rings[i].map((pt: number[]) => new THREE.Vector2(pt[0], pt[1]))));
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: LAND_Y + 1.2, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, LAND_Y, 0);
    const mesh = new THREE.Mesh(geo, [topMat, sideMat]);
    mesh.receiveShadow = true;
    mesh.castShadow = true; // banks shade the water's edge
    mesh.name = 'land';
    group.add(mesh);
  }
  if (!data.meta?.bounds) return;

  const bounds = data.meta.bounds.map((val: number) => val / DECIMETRES_PER_METRE);
  const width = bounds[2] - bounds[0];
  const depth = bounds[3] - bounds[1];
  const centerX = (bounds[0] + bounds[2]) / 2;
  const centerZ = (bounds[1] + bounds[3]) / 2;

  const earth = new THREE.Mesh(new THREE.BoxGeometry(width, 46, depth), landMaterial(PAL.base));
  earth.position.set(centerX, -0.6 - 23, centerZ);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(width + 44, 7, depth + 44), new THREE.MeshLambertMaterial({ color: '#4a3528' }));
  lip.position.set(centerX, -46.6 - 3.5, centerZ);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 150, 62, depth + 150), new THREE.MeshLambertMaterial({ color: '#2f211a' }));
  plinth.position.set(centerX, -53.6 - 31, centerZ);
  for (const mesh of [earth, lip, plinth]) {
    mesh.receiveShadow = true;
    mesh.name = 'base';
    group.add(mesh);
  }

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
  grad.addColorStop(0, 'rgba(30,22,30,0.5)');
  grad.addColorStop(0.55, 'rgba(30,22,30,0.28)');
  grad.addColorStop(1, 'rgba(30,22,30,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry((width + 150) * 1.9, (depth + 150) * 1.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, fog: false }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(centerX, -116, centerZ);
  shadowPlane.renderOrder = -5;
  group.add(shadowPlane);
}

function buildGreen(data: any, group: THREE.Group, clearings: ClearingBox[] = []) {
  const buf = new Buf(GREEN_BUF_INITIAL);
  buf.kind = KIND.GROUND;
  const surfaceY = LAND_Y + 0.03;
  for (const [kind, poly] of data.green || []) {
    const col = hex(PAL.green[kind] || PAL.green.grass);
    buf.kind = kind === 'paved' ? KIND.ROAD : KIND.GROUND;
    const rings = poly.map(unflat);
    if (clearings.length) {
      const [cx, cz] = ringCentre(rings[0]);
      if (inClearing(clearings, cx, cz)) continue;
    }
    const contour = rings[0].map((pt: number[]) => new THREE.Vector2(pt[0], pt[1]));
    const holes = rings.slice(1).map((ring: number[][]) => ring.map((pt) => new THREE.Vector2(pt[0], pt[1])));
    let faces: number[][];
    try { faces = THREE.ShapeUtils.triangulateShape(contour, holes); } catch { continue; }
    const pts = contour.concat(...holes);
    for (const tri of faces) {
      buf.tri([pts[tri[0]].x, surfaceY, pts[tri[0]].y], [pts[tri[1]].x, surfaceY, pts[tri[1]].y], [pts[tri[2]].x, surfaceY, pts[tri[2]].y], col, [0, 1, 0]);
    }
  }
  const mesh = new THREE.Mesh(buf.geometry(), overlayMaterial(0));
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  group.add(mesh);
}

// ---------- Citadel wall & Imperial City enclosure ----------
export function buildWalls(data: any, structures: Buf) {
  structures.kind = KIND.MASONRY;
  const kinhthanh = (data.places || []).find((place: any) => place.id === 'kinhthanh');
  const cityCenter = kinhthanh ? [kinhthanh.x / DECIMETRES_PER_METRE, kinhthanh.z / DECIMETRES_PER_METRE] : [0, 0];
  const impCenter = data.imperial ? [data.imperial.c[0] / DECIMETRES_PER_METRE, data.imperial.c[1] / DECIMETRES_PER_METRE] : cityCenter;
  const closeRing = (ring: number[][]) => [...ring, ring[0]];
  const gateSlots: any[] = [];
  const gateClearings: number[][][] = [];

  for (const gate of data.gates || []) {
    if (gate.k === 'citadel') {
      const axis = gateAxis(gate, cityCenter);
      gateSlots.push([closeRing(rectRing(axis.cx, axis.cz, axis.plen + 14, CITADEL_PASSAGE.slot, axis.pa))]);
    } else {
      const axis = gateAxis(gate, impCenter);
      gateClearings.push(rectRing(axis.cx, axis.cz, axis.w + 0.3, Math.max(axis.d, 4) + 0.3, axis.a));
    }
  }
  if (data.special && data.special.ngomon) {
    const box = obb(unflat(data.special.ngomon.ring));
    gateClearings.push(rectRing(box.c[0], box.c[1], box.w + 0.4, box.d + 0.4, box.a));
  }

  for (const poly of data.wall || []) {
    if (poly === data.wall[0] && replaced('kinhthanh')) continue;
    if (poly !== data.wall[0] && replaced('mangca')) continue;
    let parts: any[] = [poly.map(unflat)];
    if (gateSlots.length) {
      try {
        parts = (polygonClipping.difference as any)(parts[0].map(closeRing), ...gateSlots)
          .map((pg: any) => pg.map((ring: any) => ring.slice(0, -1)));
      } catch { /* keep the wall whole */ }
    }
    for (const rings of parts) {
      structures.prism(rings[0], LAND_Y - 0.5, LAND_Y + WALL_H, PAL.brick, PAL.moss, { holes: rings.slice(1), topKind: KIND.GROUND, parapet: 0.9 });
    }
  }

  const capCol = hex('#7a5a45');
  const bodyCol = hex('#8f7c69');
  for (const flat of replaced('dainoi') ? [] : data.iwalls || []) {
    const pts = unflat(flat);
    for (let i = 0; i + 1 < pts.length; i++) {
      const start = pts[i];
      const end = pts[i + 1];
      const len = Math.hypot(end[0] - start[0], end[1] - start[1]);
      if (len < 0.3) continue;
      const ang = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const steps = Math.max(1, Math.ceil(len / 0.4));
      const runs: [number, number][] = [];
      let runStart: number | null = null;
      for (let k = 0; k <= steps; k++) {
        const frac = k / steps;
        const x = start[0] + (end[0] - start[0]) * frac;
        const z = start[1] + (end[1] - start[1]) * frac;
        const isOut = !gateClearings.some((ring) => inRing(x, z, ring));
        if (isOut && runStart === null) runStart = frac;
        if ((!isOut || k === steps) && runStart !== null) {
          runs.push([runStart, isOut ? frac : (k - 1) / steps]);
          runStart = null;
        }
      }
      for (const [t0, t1] of runs) {
        const isWhole = t0 === 0 && t1 === 1;
        const segLen = len * (t1 - t0);
        if (!isWhole && segLen < 0.6) continue;
        const midFrac = (t0 + t1) / 2;
        const cx = start[0] + (end[0] - start[0]) * midFrac;
        const cz = start[1] + (end[1] - start[1]) * midFrac;
        structures.box(cx, cz, LAND_Y, LAND_Y + 4.0, segLen + (isWhole ? 1.5 : 0), 1.7, ang, bodyCol, { top: capCol });
        structures.kind = KIND.TILE;
        structures.box(cx, cz, LAND_Y + 4.0, LAND_Y + 4.5, segLen + (isWhole ? 1.9 : 0), 2.5, ang, capCol, { taper: 0.5 });
        structures.kind = KIND.MASONRY;
      }
    }
  }
  structures.kind = KIND.PLAIN;
}

export function buildCity(data: any) {
  const group = new THREE.Group();
  const structures: any = new Buf(STRUCTURES_BUF_INITIAL);
  structures.roofs = [];
  initTerrain(data);
  initDistricts(data);
  buildLand(data, group);
  const hills = buildTerrainMesh();
  if (hills) group.add(hills);
  const clearings = clearingsOf(data);
  structures.clearings = clearings;
  buildGreen(data, group, clearings);
  const { lamps, marks } = buildRoads(data, group, structures, clearings);
  const wallStart = structures.n;
  buildWalls(data, structures);
  structures.wallRange = [wallStart, structures.n];
  return { group, structures, lamps, marks, infill: [], trees: [] };
}

function coverOf(structures: any) {
  const COVER = 1, TALL = 2; // cell flags: covered by something standing at least 0.7 m clear of the ground; 2.2 m
  const grid = new CellGrid();
  const pos = structures.pos;
  const skipRanges: [number, number][] = [structures.wallRange || [0, 0], ...(structures.noCover || [])];
  const skipLen = skipRanges.length;
  const pavedRanges: [number, number][] | null = structures.paved || null;
  const pavedLen = pavedRanges ? pavedRanges.length : 0;
  const minClearY = LAND_Y + 0.2;

  for (let i = 0; i < structures.n; i += 3) {
    const base = i * 3;
    const ay = pos[base + 1], by = pos[base + 4], cy = pos[base + 7];
    const minY = ay < by ? (ay < cy ? ay : cy) : (by < cy ? by : cy);
    if (minY <= minClearY) continue;
    let skipped = false;
    for (let s = 0; s < skipLen; s++) {
      if (i >= skipRanges[s][0] && i < skipRanges[s][1]) { skipped = true; break; }
    }
    if (skipped) continue;

    const ax = pos[base], az = pos[base + 2];
    const bx = pos[base + 3], bz = pos[base + 5];
    const cx = pos[base + 6], cz = pos[base + 8];
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    if (ny < 0.2) continue;
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (ny * ny < 0.1225 * (nx * nx + ny * ny + nz * nz)) continue; // 0.35^2 = 0.1225

    let clearance = minY - LAND_Y - rise((ax + bx + cx) / 3, (az + bz + cz) / 3);
    if (pavedLen && clearance > 0.2 && clearance < 2.2) {
      for (let p = 0; p < pavedLen; p++) {
        if (i >= pavedRanges![p][0] && i < pavedRanges![p][1]) { clearance = 2.2; break; }
      }
    }
    if (clearance < 0.7) continue;

    const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.floor(Math.max(ax, bx, cx));
    const z0 = Math.floor(Math.min(az, bz, cz)), z1 = Math.floor(Math.max(az, bz, cz));
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        for (const [ox, oz] of COVER_SUBSAMPLES) {
          const px = ix + ox;
          const pz = iz + oz;
          const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det;
          const l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
          if (l1 > -0.02 && l2 > -0.02 && 1 - l1 - l2 > -0.02) {
            grid.set(ix, iz, clearance >= 2.2 ? COVER | TALL : COVER);
            break;
          }
        }
      }
    }
  }

  const clearings: ClearingBox[] = structures.clearings || [];
  if (clearings.length) {
    return {
      hit: (x: number, z: number) => (grid.at(x, z) & COVER) !== 0 || inClearing(clearings, x, z),
      hitTall: (x: number, z: number) => (grid.at(x, z) & TALL) !== 0 || inClearing(clearings, x, z),
    };
  }
  return {
    hit: (x: number, z: number) => (grid.at(x, z) & COVER) !== 0,
    hitTall: (x: number, z: number) => (grid.at(x, z) & TALL) !== 0,
  };
}

function roofClash(roofs: any[]) {
  const grid = new Map<number, any[]>();
  const cellKey = (i: number, j: number) => i * 100003 + j;
  for (const roof of roofs) {
    const radius = Math.hypot(roof.w, roof.d) / 2 + roof.over;
    for (let i = Math.floor((roof.cx - radius) / ROOF_CLASH_GRID_M); i <= Math.floor((roof.cx + radius) / ROOF_CLASH_GRID_M); i++) {
      for (let j = Math.floor((roof.cz - radius) / ROOF_CLASH_GRID_M); j <= Math.floor((roof.cz + radius) / ROOF_CLASH_GRID_M); j++) {
        const key = cellKey(i, j);
        const bucket = grid.get(key) || [];
        if (!grid.has(key)) grid.set(key, bucket);
        bucket.push(roof);
      }
    }
  }
  return (box: any, over: number, eaveY: number, roofH: number) => {
    const nearby = new Set<any>(grid.get(cellKey(Math.floor(box.c[0] / ROOF_CLASH_GRID_M), Math.floor(box.c[1] / ROOF_CLASH_GRID_M))) || []);
    if (!nearby.size) return false;
    const ux = Math.cos(box.a), uz = Math.sin(box.a);
    const totalW = box.w + over * 2, totalD = box.d + over * 2;
    const stepsU = Math.max(2, Math.ceil(totalW)), stepsV = Math.max(2, Math.ceil(totalD));
    for (const roof of nearby) {
      if (roof.y0 > eaveY + roofH || roof.y0 + roof.h < eaveY) continue;
      const rx = Math.cos(roof.ang), rz = Math.sin(roof.ang);
      const halfW = roof.w / 2 + roof.over, halfD = roof.d / 2 + roof.over;
      let hits = 0;
      for (let iu = 0; iu < stepsU; iu++) {
        for (let iv = 0; iv < stepsV; iv++) {
          const u = -totalW / 2 + (totalW * (iu + 0.5)) / stepsU;
          const v = -totalD / 2 + (totalD * (iv + 0.5)) / stepsV;
          const x = box.c[0] + ux * u - uz * v - roof.cx;
          const z = box.c[1] + uz * u + ux * v - roof.cz;
          if (Math.abs(x * rx + z * rz) < halfW && Math.abs(-x * rz + z * rx) < halfD) hits++;
        }
      }
      if (hits > (stepsU * stepsV) / 3) return true;
    }
    return false;
  };
}

export function populate(world: any, data: any) {
  const cover = coverOf(world.structures);
  const asphalt = world.marks ? asphaltTest([...world.marks.cw, ...(world.marks.paved || [])], world.marks.holeCells) : Object.assign(() => false, { near: () => false });
  const asphaltNear = asphalt.near;
  const maxHits = CROWN_ROAD * TREE_RING_16.length * CROWN_SAMPLE_RADII.length;

  const isOnRoad = (x: number, z: number, crownRadius: number) => {
    if (!asphaltNear(x, z, crownRadius)) return false;
    if (asphalt(x, z)) return true;
    let hits = 0;
    for (let r = 0; r < TREE_RING_16.length; r++) {
      const u = TREE_RING_16[r][0], v = TREE_RING_16[r][1];
      for (let f = 0; f < CROWN_SAMPLE_RADII.length; f++) {
        const step = crownRadius * CROWN_SAMPLE_RADII[f];
        if (asphalt(x + u * step, z + v * step)) {
          if (++hits > maxHits) return true;
        }
      }
    }
    return false;
  };

  const treeOff = (x: number, z: number, radius: number, crown = radius * 1.5) => {
    if (cover.hitTall(x, z) || isOnRoad(x, z, crown)) return true;
    for (const [u, v] of TREE_RING_8) {
      if (cover.hitTall(x + u * radius, z + v * radius) || cover.hitTall(x + u * radius * 0.5, z + v * radius * 0.5)) return true;
    }
    return false;
  };

  const sampleAxis = (span: number) => {
    const out = [-span / 2];
    for (let pos = -span / 2 + 0.5; pos < span / 2; pos += 1) out.push(pos);
    out.push(span / 2);
    return out;
  };
  const houseOff = (x: number, z: number, width: number, depth: number, ang: number) => {
    const ux = Math.cos(ang), uz = Math.sin(ang);
    const vSamples = sampleAxis(depth);
    for (const u of sampleAxis(width)) {
      for (const v of vSamples) {
        if (cover.hit(x + ux * u - uz * v, z + uz * u + ux * v)) return true;
      }
    }
    return false;
  };

  world.cover = cover;
  world.houseOff = houseOff;

  const buildingOff = (ring: number[][], center: number[]) => {
    if (!cover.hit(center[0], center[1])) return false;
    let covered = 0;
    for (const pt of ring) {
      if (cover.hit(center[0] + (pt[0] - center[0]) * 0.8, center[1] + (pt[1] - center[1]) * 0.8)) covered++;
    }
    return covered >= ring.length * 0.7;
  };

  world.buildings = buildBuildings(data, world.group, buildingOff, roofClash(world.structures.roofs || []));

  const standFns = world.structures.stand || [];
  const terraceLift = standFns.length
    ? (x: number, z: number) => { for (const fn of standFns) { const y = fn(x, z); if (y) return y; } return 0; }
    : null;
  const plantInfill = infillPlanter(world.group, houseOff);
  const plantTrees = treePlanter(data, world.group, treeOff, terraceLift);
  world.infill = plantInfill(data.infill, data.meta?.counts?.infillNear, 0);
  world.trees = plantTrees(data.trees, data.meta?.counts?.treesNear, 0);

  world.addTile = (tile: any) => {
    const houses = plantInfill(tile.infill, tile.infillNear, tile.i0[1]);
    const trees = plantTrees(tile.trees, tile.treesNear, tile.i0[0]);
    world.infill.push(...houses);
    world.trees.push(...trees);
    return [...houses, ...trees];
  };
}

export function finishStructures(structures: Buf, group: THREE.Group) {
  const mesh = new THREE.Mesh(structures.geometry(), cityMaterial({ windows: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'structures';
  group.add(mesh);
  return mesh;
}
