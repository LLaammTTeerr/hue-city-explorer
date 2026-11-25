import * as THREE from 'three';
import { Buf, hex, shade, unflat, pathLength } from '../../geo/buf.ts';
import { cityMaterial, enc } from '../../geo/materials.ts';
import { rise } from '../../geo/terrain.ts';
import { LAND_Y, ROAD_W, quality } from '../../config.ts';
import { bridgeProfiles, ownLit } from '../../geo/bridges.ts';
import { landTest } from '../boats.ts';
import { replaced } from '../places/index.ts';
import { ownRoads as daVienRoads } from '../places/bachho.ts';
import { rng, along, widthAt, readRoads, mkPath, seek, place, chain, clipRuns, placeById, truongTienFrame, BRIDGE_TOP, RAIL_BRIDGE_TOP, ON_GROUND, tmp } from './paths.ts';

const MAX_DT_S = 0.1;
const LAMP_ARM_M = 0.9;
const LAMP_STEP_PRIMARY_M = 30;
const LAMP_STEP_SECONDARY_M = 36;
const LAMP_HEAD_HEIGHT_M = 7.5;
const PED_SEED = 1945;
const PED_SCALE = 1.1;
const PED_TURN_DUR_S = 0.8;
const TRAIN_UNITS_M = [16, 20, 20, 20, 20, 20, 20];
const TRAIN_GAP_M = 1;
const TRAIN_MAX_SPEED = 10;
const TRAIN_STOP_DWELL_S = 20;
const TRAIN_END_DWELL_S = 10;

const AODAI_COLS = ['#f6f3ec', '#f6f3ec', '#7b4a9e', '#9566b8', '#b5cfe5', '#e6d6ee'].map(hex);
const EVERYDAY_COLS = ['#2f3e5a', '#b8392f', '#e3d7bc', '#55744a', '#38383c', '#d48a3a', '#8fb1c8', '#efebe3', '#6e4b3a', '#c7c2b6', '#4d6a8a'].map(hex);

export function buildStreetLife(data: any, group: THREE.Group) {
  const updates: ((dt: number, time: number) => void)[] = [];
  for (const builder of [buildLampPosts, buildPedestrians, buildTrain]) {
    try {
      const updateFn = builder(data, group);
      if (updateFn) updates.push(updateFn);
    } catch (err) {
      console.warn('street life: skipped', builder.name, err);
    }
  }
  return {
    update(dt: number, time: number) {
      const stepDt = Math.min(dt, MAX_DT_S);
      for (const updateFn of updates) updateFn(stepDt, time);
    },
  };
}

const maxLampPosts = () => (quality.low ? 800 : 3000);

function buildLampPosts(data: any, group: THREE.Group) {
  const roads = readRoads(data);
  const profiles = bridgeProfiles(data);
  const kyDai = placeById(data).get('kydai') || [0, 0];
  const daVienOwned = replaced('bachho') ? daVienRoads(data) : null;
  const spots: [number, number, number, number, number, number][] = [];

  for (const road of roads) {
    if (road.c > 2 || road.unmarked || road.pts.length < 2 || (road.bridge && daVienOwned && daVienOwned.has(road.flat))) continue;
    const profile = road.bridge && profiles.get(road.flat);
    if (profile && profile.lamps && replaced(profile.lamps.own)) continue;
    const step = road.c === 0 ? LAMP_STEP_PRIMARY_M : LAMP_STEP_SECONDARY_M;
    for (let dist = step / 2, k = 0; dist < road.len; dist += step, k++) {
      const { p, a } = along(road.pts, dist);
      const side = k % 2 ? 1 : -1;
      const off = ((road.ws ? widthAt(road.pts, road.ws, p) : road.w) / 2 + 0.5) * side;
      const lx = p[0] - Math.sin(a) * off;
      const lz = p[1] + Math.cos(a) * off;
      if (ownLit(data, lx, lz)) continue;
      const baseY = profile ? profile.y(dist) : road.bridge ? Math.max(BRIDGE_TOP, LAND_Y + rise(lx, lz)) : LAND_Y + rise(lx, lz);
      const glowY = profile ? profile.y(dist) + 7.58 : LAND_Y + rise(lx, lz) + (road.bridge ? 8 : LAMP_HEAD_HEIGHT_M);
      const outX = -Math.sin(a) * side, outZ = Math.cos(a) * side;
      const distToCore = Math.min(Math.hypot(lx, lz), Math.hypot(lx - kyDai[0], lz - kyDai[1]));
      spots.push([lx, lz, baseY, (glowY - baseY) / LAMP_HEAD_HEIGHT_M, Math.atan2(-outZ, outX), distToCore]);
    }
  }
  if (!spots.length) return null;
  spots.sort((a, b) => a[5] - b[5]);
  if (spots.length > maxLampPosts()) spots.length = maxLampPosts();

  const geo = new Buf(16);
  const dark = hex('#3a4641'), glass = hex('#f2e6c4');
  geo.cyl(LAMP_ARM_M, 0, 0, 7.8, 0.11, 0.06, 3, dark, { cap: false });
  geo.quad([LAMP_ARM_M, 7.85, 0], [-0.05, 7.8, 0], [-0.05, 7.7, -0.07], [LAMP_ARM_M, 7.75, -0.07], dark, [0, 1, -1]);
  geo.quad([LAMP_ARM_M, 7.85, 0], [-0.05, 7.8, 0], [-0.05, 7.7, 0.07], [LAMP_ARM_M, 7.75, 0.07], dark, [0, 1, 1]);
  const ring = [0, 1, 2].map((k) => [Math.cos((k * 2 * Math.PI) / 3) * 0.27, 7.7, Math.sin((k * 2 * Math.PI) / 3) * 0.27]);
  for (let k = 0; k < 3; k++) {
    const p0 = ring[k], p1 = ring[(k + 1) % 3];
    geo.tri(p0, p1, [0, 7.28, 0], glass, [p0[0] + p1[0], -0.4, p0[2] + p1[2]]);
  }
  geo.tri(ring[0], ring[1], ring[2], dark, [0, 1, 0]);

  const mesh = new THREE.InstancedMesh(geo.geometry(), cityMaterial(), spots.length);
  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), scaleVec = new THREE.Vector3(), posVec = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, y, heightScale, yaw], i) => {
    quat.setFromAxisAngle(up, yaw);
    posVec.set(x, y, z);
    scaleVec.set(1, heightScale, 1);
    mesh.setMatrixAt(i, mat4.compose(posVec, quat, scaleVec));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = !quality.low;
  mesh.layers.set(1);
  group.add(mesh);
  return null;
}

function collectPedestrianSpots(data: any, roads: any[], places: Map<string, any>, onLand: (x: number, z: number) => boolean, ttFrame: any) {
  const roadPath = (pts: number[][], roadClass: number, width = ROAD_W[roadClass]) => {
    const path: any = mkPath(pts);
    if (roadClass <= 2) { path.pav = width / 2 + 1.5; path.half = 0.4; }
    else { path.pav = 0; path.half = Math.max(0.3, width / 2 - 0.4); }
    return path;
  };
  const freePath = (pts: number[][], half = 2.5) => { const path: any = mkPath(pts); path.pav = 0; path.half = half; return path; };
  const roadsNear = (cx: number, cz: number, radius: number, maxClass = 5) => {
    const out: any[] = [], radSq = radius * radius;
    for (const road of roads) {
      if (road.c > maxClass || road.x1 < cx - radius || road.x0 > cx + radius || road.z1 < cz - radius || road.z0 > cz + radius) continue;
      for (const run of clipRuns(road.pts, (x, z) => (x - cx) ** 2 + (z - cz) ** 2 < radSq, 5, 14)) out.push(roadPath(run, road.c, road.w));
    }
    return out;
  };
  const promenade = (cx: number, cz: number, ux: number, uz: number, halfLen: number, width = 2.5) => {
    const runs = clipRuns([[cx - ux * halfLen, cz - uz * halfLen], [cx + ux * halfLen, cz + uz * halfLen]], onLand, 4, 20);
    return runs.map((run) => freePath(run, width));
  };

  const gridAlong = ttFrame ? ttFrame.d : [0.73, 0.68];
  const gridAcross = ttFrame ? ttFrame.n : [-0.68, 0.73];
  const spots: any[] = [];
  const getPlace = (id: string): [number, number] | undefined => places.get(id) as [number, number] | undefined;

  const ndChieu = getPlace('ndchieu');
  if (ndChieu) {
    const [x, z] = ndChieu;
    const paths = roadsNear(x, z, 220);
    let ox = 0, oz = 0;
    for (const sgn of [1, -1]) {
      if (!onLand(x + gridAlong[0] * 40 * sgn, z + gridAlong[1] * 40 * sgn) && onLand(x + gridAlong[0] * 12 * sgn, z + gridAlong[1] * 12 * sgn)) {
        ox = gridAlong[0] * 12 * sgn; oz = gridAlong[1] * 12 * sgn; break;
      }
    }
    paths.push(...promenade(x + ox, z + oz, gridAcross[0], gridAcross[1], 200, 3));
    spots.push({ paths, share: 0.17, aodai: 0.3 });
  }
  if (ttFrame) {
    spots.push({
      paths: [-1, 1].map((side) => { const path = ttFrame.lane(side * ttFrame.walkOff, 0.12); path.pav = 0; path.half = 0.5; return path; }),
      share: 0.07, aodai: 0.3, noGroups: true,
    });
  }
  if (getPlace('dongba')) spots.push({ paths: roadsNear(...getPlace('dongba')!, 170), share: 0.14, aodai: 0.15 });
  if (getPlace('photay')) spots.push({ paths: roadsNear(...getPlace('photay')!, 200), share: 0.15, aodai: 0.08 });
  if (getPlace('kydai') && getPlace('ngomon')) {
    const [ax, az] = getPlace('kydai')!, [bx, bz] = getPlace('ngomon')!;
    const dist = Math.hypot(bx - ax, bz - az) || 1;
    const ux = (bx - ax) / dist, uz = (bz - az) / dist;
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const paths = roadsNear(cx, cz, dist * 0.6, 3);
    for (const off of [-28, 0, 28]) paths.push(...promenade(cx - uz * off, cz + ux * off, ux, uz, dist * 0.34, 4));
    paths.push(...promenade(cx, cz, -uz, ux, 45, 4));
    spots.push({ paths, share: 0.12, aodai: 0.35 });
  }
  if (getPlace('phuvanlau')) {
    const [ax, az] = getPlace('phuvanlau')!;
    const paths = roadsNear(ax, az, 130, 3);
    const nghenh = getPlace('nghenhluong');
    if (nghenh) {
      const [bx, bz] = nghenh, dist = Math.hypot(bx - ax, bz - az) || 1;
      paths.push(...promenade((ax + bx) / 2, (az + bz) / 2, (bx - ax) / dist, (bz - az) / dist, dist / 2 + 90, 3));
    }
    spots.push({ paths, share: 0.05, aodai: 0.3 });
  }
  if (getPlace('gahue')) spots.push({ paths: roadsNear(...getPlace('gahue')!, 110), share: 0.03, aodai: 0.1 });
  if (getPlace('quochoc')) spots.push({ paths: roadsNear(...getPlace('quochoc')!, 110), share: 0.03, aodai: 0.6 });

  const centers: [number, number, number][] = [[0, 0, 1500]];
  const kyDai = getPlace('kydai');
  if (kyDai) centers.push([kyDai[0], kyDai[1] - 300, 1000]);
  const pavements: any[] = [];
  for (const road of roads) {
    if (road.c > 2) continue;
    for (const run of clipRuns(road.pts, (x, z) => centers.some(([cx, cz, rad]) => (x - cx) ** 2 + (z - cz) ** 2 < rad * rad), 8, 30)) {
      pavements.push(roadPath(run, road.c, road.w));
    }
  }
  spots.push({ paths: pavements, share: 0.24, aodai: 0.12 });
  return spots.filter((spot) => spot.paths.length && spot.paths.some((path: any) => path.len > 1));
}

function buildPedestrianGeometries() {
  const body = new Buf(20);
  body.cyl(0, 0, 0, 0.8, 0.1, 0.16, 4, [0.72, 0.72, 0.72], { cap: false, rot: Math.PI / 4 });
  body.cyl(0, 0, 0.8, 1.45, 0.17, 0.1, 4, [1, 1, 1], { cap: false, rot: Math.PI / 4 });
  const skin = hex('#c99a74'), straw = hex('#e4d6a8'), hair = hex('#1e1917');
  const hatHead = new Buf(16);
  hatHead.cyl(0, 0, 1.43, 1.64, 0.1, 0.095, 4, skin, { cap: false, rot: Math.PI / 4 });
  hatHead.cyl(0, 0, 1.6, 1.84, 0.34, 0, 6, straw, { cap: false });
  const bareHead = new Buf(16);
  bareHead.cyl(0, 0, 1.43, 1.62, 0.1, 0.1, 4, skin, { cap: false, rot: Math.PI / 4 });
  bareHead.cyl(0, 0, 1.62, 1.71, 0.105, 0, 4, hair, { cap: false, rot: Math.PI / 4 });
  return { body, hatHead, bareHead };
}

function buildPedestrians(data: any, group: THREE.Group) {
  const rnd = rng(PED_SEED);
  const roads = readRoads(data).filter((road: any) => !road.bridge && road.pts.length >= 2);
  const liveSpots = collectPedestrianSpots(data, roads, placeById(data), landTest(data, { ponds: true }), truongTienFrame(data));
  if (!liveSpots.length) return null;

  const totalPeople = quality.low ? 300 : 900;
  const shareSum = liveSpots.reduce((sum, spot) => sum + spot.share, 0);
  const people: any[] = [];

  for (const spot of liveSpots) {
    const targetCount = Math.round((totalPeople * spot.share) / shareSum);
    const validPaths = spot.paths.filter((path: any) => path.len > 1);
    const cumLen: number[] = [];
    let totalLen = 0;
    for (const path of validPaths) { totalLen += path.len; cumLen.push(totalLen); }
    const pickPath = () => {
      const roll = rnd() * totalLen;
      for (let i = 0; i < cumLen.length; i++) if (roll <= cumLen[i]) return validPaths[i];
      return validPaths[validPaths.length - 1];
    };
    const sampleLateral = (path: any) => (path.pav ? (rnd() < 0.5 ? -1 : 1) * (path.pav + (rnd() - 0.5) * 2 * path.half) : (rnd() * 2 - 1) * path.half);
    const pickOutfit = () => { const aodai = rnd() < spot.aodai; return { aodai, hat: rnd() < (aodai ? 0.65 : 0.3) }; };

    let remaining = targetCount;
    if (!spot.noGroups) {
      let standingCount = Math.round(targetCount * 0.12);
      while (standingCount >= 3) {
        const groupSize = Math.min(standingCount, 3 + Math.floor(rnd() * 3));
        const path = pickPath(), dist = rnd() * path.len, seg = seek(path, dist, 1);
        place(path, dist, seg, sampleLateral(path), tmp);
        const cx = tmp.x, cz = tmp.z;
        for (let j = 0; j < groupSize; j++) {
          const ang = (j / groupSize) * Math.PI * 2 + rnd() * 0.5, rad = 0.55 + rnd() * 0.25;
          const x = cx + Math.cos(ang) * rad, z = cz + Math.sin(ang) * rad;
          people.push({ still: true, x, z, y: LAND_Y + rise(x, z) + ON_GROUND, yaw: Math.atan2(Math.sin(ang), -Math.cos(ang)), ...pickOutfit() });
        }
        standingCount -= groupSize;
        remaining -= groupSize;
      }
    }
    for (let i = 0; i < remaining; i++) {
      const path = pickPath();
      people.push({
        still: false, path, s: rnd() * path.len, dir: rnd() < 0.5 ? 1 : -1, lat: sampleLateral(path),
        speed: 0.9 + rnd() * 0.7, phase: rnd() * 6.28, turn: 0, wait: 0, go: 20 + rnd() * 120, seg: 1, ...pickOutfit(),
      });
    }
  }
  if (!people.length) return null;

  const { body, hatHead, bareHead } = buildPedestrianGeometries();
  const mat = cityMaterial();
  const makeInstanced = (geo: Buf, count: number) => {
    const mesh = new THREE.InstancedMesh(geo.geometry(), mat, Math.max(1, count));
    mesh.count = count;
    mesh.castShadow = !quality.low;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  };

  people.forEach((person) => {
    const palette = person.aodai ? AODAI_COLS : EVERYDAY_COLS;
    person.col = shade(palette[Math.floor(rnd() * palette.length)], 0.88 + rnd() * 0.12);
    person.headCol = shade([1, 1, 1], 0.86 + rnd() * 0.14);
  });
  const hatCount = people.filter((person) => person.hat).length;
  const bodies = makeInstanced(body, people.length);
  const hats = makeInstanced(hatHead, hatCount);
  const bares = makeInstanced(bareHead, people.length - hatCount);
  const colorTmp = new THREE.Color();

  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), scaleVec = new THREE.Vector3(PED_SCALE, PED_SCALE, PED_SCALE), posVec = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const walkers: any[] = [];
  let hatIdx = 0, bareIdx = 0;
  people.forEach((person, i) => {
    person.i = i;
    person.head = person.hat ? hats : bares;
    person.j = person.hat ? hatIdx++ : bareIdx++;
    bodies.setColorAt(person.i, enc(person.col, colorTmp));
    person.head.setColorAt(person.j, enc(person.headCol, colorTmp));
    if (person.still) {
      quat.setFromAxisAngle(up, person.yaw);
      posVec.set(person.x, person.y, person.z);
      mat4.compose(posVec, quat, scaleVec);
      bodies.setMatrixAt(person.i, mat4);
      person.head.setMatrixAt(person.j, mat4);
    } else walkers.push(person);
  });
  const pedMeshes = [bodies, hats, bares];
  for (const mesh of pedMeshes) {
    mesh.visible = mesh.count > 0;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  const update = (dt: number) => {
    if (!bodies.visible) return;
    for (let i = 0; i < walkers.length; i++) {
      const walker = walkers[i];
      let moving = false;
      if (walker.wait > 0) walker.wait -= dt;
      else if (walker.turn > 0) walker.turn = Math.max(0, walker.turn - dt);
      else {
        const step = walker.speed * dt;
        walker.s += walker.dir * step;
        walker.go -= step;
        walker.phase += step * 4.8;
        moving = true;
        if (walker.s > walker.path.len) { walker.s = walker.path.len; walker.dir = -1; walker.turn = PED_TURN_DUR_S; }
        else if (walker.s < 0) { walker.s = 0; walker.dir = 1; walker.turn = PED_TURN_DUR_S; }
        else if (walker.go < 0) { walker.go = 25 + rnd() * 110; walker.wait = 1.5 + rnd() * 6; }
      }
      walker.seg = seek(walker.path, walker.s, walker.seg);
      place(walker.path, walker.s, walker.seg, walker.lat, tmp);
      const yaw = Math.atan2(-tmp.dz * walker.dir, tmp.dx * walker.dir)
        + (walker.turn > 0 ? (Math.PI * walker.turn) / PED_TURN_DUR_S : 0)
        + (moving ? Math.sin(walker.phase) * 0.06 : 0);
      quat.setFromAxisAngle(up, yaw);
      posVec.set(tmp.x, tmp.y + (moving ? Math.abs(Math.sin(walker.phase)) * 0.045 : 0), tmp.z);
      mat4.compose(posVec, quat, scaleVec);
      bodies.setMatrixAt(walker.i, mat4);
      walker.head.setMatrixAt(walker.j, mat4);
    }
    for (let k = 0; k < pedMeshes.length; k++) if (pedMeshes[k].visible) pedMeshes[k].instanceMatrix.needsUpdate = true;
  };
  update(0);
  return update;
}

function buildTrain(data: any, group: THREE.Group) {
  const railLines: any[] = [];
  for (const rail of data.rails || []) {
    if (!Array.isArray(rail) || !Array.isArray(rail[2]) || rail[2].length < 4 || !rail[0]) continue;
    const pts = unflat(rail[2]);
    railLines.push({ pts, len: pathLength(pts), c: 0, h: rail[1] ? RAIL_BRIDGE_TOP : NaN });
  }
  if (!railLines.length) return null;
  const chains = chain(railLines, 3, () => true);
  const track = chains.reduce((longest: any, cur: any) => (cur.len > longest.len ? cur : longest), chains[0]);
  const trainLen = TRAIN_UNITS_M.reduce((sum, len) => sum + len, 0) + TRAIN_GAP_M * (TRAIN_UNITS_M.length - 1);
  if (!track || track.len < trainLen + 100) return null;

  const unitOffsets: number[] = [];
  for (let k = 0, acc = 0; k < TRAIN_UNITS_M.length; k++) { unitOffsets.push(acc + TRAIN_UNITS_M[k] / 2); acc += TRAIN_UNITS_M[k] + TRAIN_GAP_M; }

  let stationS = -1;
  const gaHue = placeById(data).get('gahue');
  if (gaHue) {
    let bestDist = 300;
    for (let i = 1; i < track.pts.length; i++) {
      const p0 = track.pts[i - 1], p1 = track.pts[i], segLen = track.acc[i] - track.acc[i - 1];
      if (segLen < 1e-6) continue;
      const frac = Math.max(0, Math.min(1, ((gaHue[0] - p0[0]) * (p1[0] - p0[0]) + (gaHue[1] - p0[1]) * (p1[1] - p0[1])) / (segLen * segLen)));
      const dist = Math.hypot(p0[0] + (p1[0] - p0[0]) * frac - gaHue[0], p0[1] + (p1[1] - p0[1]) * frac - gaHue[1]);
      if (dist < bestDist) { bestDist = dist; stationS = track.acc[i - 1] + frac * segLen; }
    }
    if (stationS >= 0) stationS = Math.max(trainLen / 2 + 1, Math.min(track.len - trainLen / 2 - 1, stationS));
  }

  const geo = new Buf(36);
  geo.box(0, 0, 0.3, 0.75, 1, 2.2, 0, [0.22, 0.22, 0.22]);
  geo.box(0, 0, 0.75, 3.6, 1, 2.9, 0, [1, 1, 1]);
  geo.box(0, 0, 3.6, 3.85, 0.98, 2.5, 0, [0.62, 0.62, 0.6]);
  const mesh = new THREE.InstancedMesh(geo.geometry(), cityMaterial(), TRAIN_UNITS_M.length);
  const colorTmp = new THREE.Color();
  TRAIN_UNITS_M.forEach((_, k) => mesh.setColorAt(k, enc(hex(k === 0 ? '#b8462f' : k % 2 ? '#2f5f8f' : '#33658f'), colorTmp)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = !quality.low;
  mesh.frustumCulled = false;
  mesh.layers.set(1);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);

  const state = { front: stationS > 0 ? stationS + trainLen / 2 : trainLen + 40, dir: 1, wait: stationS > 0 ? 6 : 0, served: stationS > 0 };
  const segA = new Int32Array(TRAIN_UNITS_M.length).fill(1);
  const segB = new Int32Array(TRAIN_UNITS_M.length).fill(1);
  const bogieA = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };
  const bogieB = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };
  const mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YZX'), scaleVec = new THREE.Vector3(), posVec = new THREE.Vector3();
  let placed = false;

  const update = (dt: number) => {
    if (state.wait > 0) {
      state.wait -= dt;
      if (placed) return;
    } else {
      const midS = state.front - trainLen / 2;
      const speed = stationS > 0 ? TRAIN_MAX_SPEED * Math.max(0.12, Math.min(1, Math.abs(midS - stationS) / 260)) : TRAIN_MAX_SPEED;
      const before = (stationS - midS) * state.dir;
      state.front += state.dir * speed * dt;
      const after = (stationS - (state.front - trainLen / 2)) * state.dir;
      if (state.served && Math.abs(midS - stationS) > 50) state.served = false;
      if (stationS > 0 && !state.served && before > 0 && after <= 0) { state.front = stationS + trainLen / 2; state.wait = TRAIN_STOP_DWELL_S; state.served = true; }
      if (state.front > track.len) { state.front = track.len; state.dir = -1; state.wait = TRAIN_END_DWELL_S; }
      else if (state.front - trainLen < 0) { state.front = trainLen; state.dir = 1; state.wait = TRAIN_END_DWELL_S; }
    }
    placed = true;
    for (let k = 0; k < TRAIN_UNITS_M.length; k++) {
      const centerS = state.front - unitOffsets[k];
      const halfBogie = TRAIN_UNITS_M[k] * 0.36;
      segA[k] = seek(track, centerS - halfBogie, segA[k]);
      segB[k] = seek(track, centerS + halfBogie, segB[k]);
      place(track, centerS - halfBogie, segA[k], 0, bogieA);
      place(track, centerS + halfBogie, segB[k], 0, bogieB);
      const dx = bogieB.x - bogieA.x, dz = bogieB.z - bogieA.z;
      euler.set(0, Math.atan2(-dz, dx), Math.atan2(bogieB.y - bogieA.y, Math.hypot(dx, dz)));
      quat.setFromEuler(euler);
      posVec.set((bogieA.x + bogieB.x) / 2, (bogieA.y + bogieB.y) / 2, (bogieA.z + bogieB.z) / 2);
      scaleVec.set(TRAIN_UNITS_M[k], 1, 1);
      mesh.setMatrixAt(k, mat4.compose(posVec, quat, scaleVec));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return update;
}
