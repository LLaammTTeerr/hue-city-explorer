import * as THREE from 'three';
import { Buf, hex } from '../../geo/buf.ts';
import { cityMaterial, enc } from '../../geo/materials.ts';
import { bridgeProfiles, resample } from '../../geo/bridges.ts';
import { quality } from '../../config.ts';
import { rng, readRoads, seek, place, chain, placeById, truongTienFrame, BRIDGE_TOP, tmp } from './paths.ts';

const TRAFFIC_SEED = 1899;
const MIN_ROUTE_LEN_M = 160;
const TRUNK_MIN_LEN_M = 400;
const CYCLO_HUB_RADIUS_M = 450;
const CYCLO_MIN_SPAN_M = 80;
const CYCLO_HUB_IDS = ['kydai', 'ngomon', 'dongba', 'photay', 'ndchieu'];
const MAX_STEP_DT_S = 0.1;
const LANE_DRIFT_SPEED = 2.5;
const VEHICLE_HALF_W: Record<string, number> = { bike: 0.23, car: 0.875, bus: 1.225, cyclo: 0.475 };
const MESH_INDEX: Record<string, number> = { bike: 0, car: 1, bus: 1, cyclo: 2 };

const VEHICLE_COLORS: Record<string, number[][]> = {
  bike: ['#b3352b', '#2f4f7a', '#2a2a2e', '#e8e4da', '#d6a12e', '#3f7a5a', '#7a3f5a'].map(hex),
  car: ['#eeeae2', '#c9c9c6', '#2e3338', '#2f8a5a', '#8a2f2c', '#3f5f8a'].map(hex),
  bus: ['#e2b43c', '#2f7f9e', '#d9dcd6'].map(hex),
  cyclo: ['#3f6b5a', '#7a3a34', '#33415e', '#c8a24a'].map(hex),
};

function makeWeightedPicker<T>(list: T[], weightFn: (item: T) => number, rnd: () => number) {
  const cumulative: number[] = [];
  let total = 0;
  for (const item of list) { total += weightFn(item); cumulative.push(total); }
  return () => {
    const target = rnd() * total;
    let lo = 0, hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1; else hi = mid;
    }
    return list[lo];
  };
}

function buildVehicleGeometries() {
  const white = [1, 1, 1];
  const bikeGeo = new Buf(24);
  bikeGeo.box(0, 0, 0.25, 0.85, 1.7, 0.42, 0, [0.45, 0.45, 0.45]);
  bikeGeo.box(-0.12, 0, 0.85, 1.72, 0.5, 0.46, 0, white, { taper: 0.6 });

  const carGeo = new Buf(24);
  carGeo.box(0, 0, 0.3, 0.95, 4.2, 1.75, 0, white);
  carGeo.box(-0.2, 0, 0.95, 1.5, 2.3, 1.6, 0, [0.42, 0.5, 0.56], { taper: 0.86 });

  const cycloGeo = new Buf(48);
  cycloGeo.box(0.55, 0, 0.35, 0.95, 0.9, 0.95, 0, white);
  cycloGeo.box(0.5, 0, 0.95, 1.5, 0.45, 0.5, 0, [0.95, 0.88, 0.78], { taper: 0.7 });
  cycloGeo.box(-0.45, 0, 0.3, 0.72, 1.1, 0.22, 0, [0.35, 0.35, 0.35]);
  cycloGeo.box(-0.8, 0, 0.72, 1.72, 0.42, 0.42, 0, [0.8, 0.75, 0.68], { taper: 0.65 });

  return [bikeGeo, carGeo, cycloGeo];
}

// Motorbikes, cars, buses and cyclos on the main streets — Huế moves on two wheels.
export function buildTraffic(data: any, group: THREE.Group) {
  const rnd = rng(TRAFFIC_SEED);
  const roads = readRoads(data);
  const profiles = bridgeProfiles(data);
  const lines = roads.filter((road: any) => road.c <= 2 && road.len > 1).map((road: any) => {
    const profile = road.bridge && profiles.get(road.flat);
    if (!profile) return { pts: road.pts, len: road.len, c: road.c, w: road.w, h: road.bridge ? BRIDGE_TOP + 0.02 : NaN };
    let acc = 0;
    const sampled = profile.rise > 0
      ? resample(road.pts, 2)
      : { pts: road.pts, s: road.pts.map((pt: number[], i: number) => (acc += i ? Math.hypot(pt[0] - road.pts[i - 1][0], pt[1] - road.pts[i - 1][1]) : 0)) };
    return {
      pts: sampled.pts, len: road.len, c: road.c, w: road.w, h: BRIDGE_TOP + 0.02,
      hs: sampled.s.map((dist: number) => Math.max(BRIDGE_TOP, profile.base(dist)) + profile.bump(dist) + 0.02),
    };
  });
  const paths = chain(lines, 1.5, (a: any, b: any) => Math.abs(a.c - b.c) <= 1).filter((path: any) => path.len > MIN_ROUTE_LEN_M);
  const ttFrame = truongTienFrame(data);
  if (!paths.length && !ttFrame) return { update() {} };

  const places = placeById(data);
  const isLow = quality.low;
  const totalVehicles = isLow ? 250 : 700;
  const busCount = isLow ? 4 : 12;
  const cycloCount = isLow ? 6 : 18;
  const ttCount = ttFrame ? (isLow ? 14 : 40) : 0;
  const restCount = totalVehicles - busCount - cycloCount - ttCount;

  const vehicles: any[] = [];
  const spawn = (kind: string, path: any, s0: number, s1: number, speed: number, lane: number, turnDur: number, scale: number[] | null = null) => {
    const dir = rnd() < 0.5 ? 1 : -1;
    const dist = s0 + rnd() * (s1 - s0);
    const seg = seek(path, dist, 1);
    const halfW = VEHICLE_HALF_W[kind] || 0.5;
    const effLane = path.hw ? Math.min(lane, Math.max(0.5, path.hw[seg] - halfW - 0.3)) : lane;
    vehicles.push({ kind, path, s0, s1, s: dist, dir, speed, lane, hw: halfW, off: dir * effLane, turn: 0, turnDur, seg, scale, mesh: null, idx: 0, meshIdx: 0 });
  };

  if (paths.length) {
    const pickRoute = makeWeightedPicker(paths, (path: any) => {
      const mid = path.pts[path.pts.length >> 1];
      return path.len * (1 + 2.5 * Math.exp(-Math.hypot(mid[0], mid[1]) / 1800));
    }, rnd);
    for (let i = 0; i < restCount; i++) {
      const path = pickRoute();
      const isWide = path.c === 0;
      if (rnd() < 0.14) spawn('car', path, 0, path.len, 7 + rnd() * 4, 2.6 + rnd() * (isWide ? 2.2 : 1.0), 2.2);
      else spawn('bike', path, 0, path.len, 5.5 + rnd() * 5, 1.6 + rnd() * (isWide ? 2.4 : 1.0), 1.2);
    }

    const trunkPaths = paths.filter((path: any) => path.c === 0 && path.len > TRUNK_MIN_LEN_M);
    if (trunkPaths.length) {
      const pickTrunk = makeWeightedPicker(trunkPaths, (path: any) => path.len, rnd);
      for (let i = 0; i < busCount; i++) {
        const path = pickTrunk();
        spawn('bus', path, 0, path.len, 6 + rnd() * 2.5, 3.3 + rnd() * 0.8, 3.2, [2.7, 2.0, 1.4]);
      }
    }

    const hubs = CYCLO_HUB_IDS.map((id) => places.get(id)).filter(Boolean);
    const cycloSpans: { path: any; s0: number; s1: number }[] = [];
    for (const path of paths) {
      let s0 = Infinity, s1 = -Infinity;
      path.pts.forEach((pt: number[], j: number) => {
        if (hubs.some((hub: number[]) => Math.hypot(pt[0] - hub[0], pt[1] - hub[1]) < CYCLO_HUB_RADIUS_M)) {
          s0 = Math.min(s0, path.acc[j]);
          s1 = Math.max(s1, path.acc[j]);
        }
      });
      if (s1 - s0 > CYCLO_MIN_SPAN_M) cycloSpans.push({ path, s0, s1 });
    }
    if (cycloSpans.length) {
      const pickSpan = makeWeightedPicker(cycloSpans, (span) => span.s1 - span.s0, rnd);
      for (let i = 0; i < cycloCount; i++) {
        const span = pickSpan();
        spawn('cyclo', span.path, span.s0, span.s1, 2.2 + rnd() * 1.4, 1.5 + rnd() * 1.4, 2.0);
      }
    }
  }

  if (ttFrame) {
    const ttLane = ttFrame.lane(0, 0.04);
    for (let i = 0; i < ttCount; i++) {
      spawn('bike', ttLane, 0, ttLane.len, 4 + rnd() * 4, 0.9 + rnd() * Math.max(0.3, ttFrame.trussX - 1.3), 1.2);
    }
  }

  const geos = buildVehicleGeometries();
  const mat = cityMaterial();
  const counts = [0, 0, 0];
  for (const vehicle of vehicles) {
    vehicle.meshIdx = MESH_INDEX[vehicle.kind];
    vehicle.idx = counts[vehicle.meshIdx]++;
  }
  const meshes = geos.map((geo, meshIdx) => {
    const count = counts[meshIdx];
    const mesh = new THREE.InstancedMesh(geo.geometry(), mat, Math.max(1, count));
    mesh.count = count;
    mesh.visible = count > 0;
    mesh.castShadow = !quality.low;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  });

  const colorTmp = new THREE.Color();
  for (const vehicle of vehicles) {
    vehicle.mesh = meshes[vehicle.meshIdx];
    const palette = VEHICLE_COLORS[vehicle.kind];
    vehicle.mesh.setColorAt(vehicle.idx, enc(palette[vehicle.idx % palette.length], colorTmp));
  }
  for (const mesh of meshes) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  const posVec = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);

  function update(dt: number) {
    const stepDt = Math.min(dt, MAX_STEP_DT_S);
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      if (vehicle.turn > 0) {
        vehicle.turn = Math.max(0, vehicle.turn - stepDt);
      } else {
        vehicle.s += vehicle.dir * vehicle.speed * stepDt;
        if (vehicle.s > vehicle.s1) { vehicle.s = vehicle.s1; vehicle.dir = -1; vehicle.turn = vehicle.turnDur; }
        else if (vehicle.s < vehicle.s0) { vehicle.s = vehicle.s0; vehicle.dir = 1; vehicle.turn = vehicle.turnDur; }
      }
      vehicle.seg = seek(vehicle.path, vehicle.s, vehicle.seg);
      const targetLane = vehicle.path.hw ? Math.min(vehicle.lane, Math.max(0.5, vehicle.path.hw[vehicle.seg] - vehicle.hw - 0.3)) : vehicle.lane;
      const driftDelta = vehicle.dir * targetLane - vehicle.off;
      const maxDrift = LANE_DRIFT_SPEED * stepDt;
      vehicle.off += driftDelta > maxDrift ? maxDrift : driftDelta < -maxDrift ? -maxDrift : driftDelta;
      place(vehicle.path, vehicle.s, vehicle.seg, vehicle.off, tmp);
      const yaw = Math.atan2(-tmp.dz * vehicle.dir, tmp.dx * vehicle.dir) + (vehicle.turn > 0 ? (Math.PI * vehicle.turn) / vehicle.turnDur : 0);
      quat.setFromAxisAngle(upAxis, yaw);
      posVec.set(tmp.x, tmp.y, tmp.z);
      if (vehicle.scale) scaleVec.set(vehicle.scale[0], vehicle.scale[1], vehicle.scale[2]);
      else scaleVec.set(1, 1, 1);
      vehicle.mesh.setMatrixAt(vehicle.idx, mat4.compose(posVec, quat, scaleVec));
    }
    for (const mesh of meshes) if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
  }

  update(0);
  return { update };
}
