import * as THREE from 'three';
import { Buf, hex, shade, unflat, pathLength } from '../../geo/buf.js';
import { cityMaterial, enc } from '../../geo/materials.js';
import { rise } from '../../geo/terrain.js';
import { LAND_Y, quality, roadWidth } from '../../config.js';
import { bridgeProfiles, resample, ownLit } from '../../geo/bridges.js';
import { landTest } from '../boats.js';
import { replaced } from '../places/index.js';
import { ownRoads as daVienRoads } from '../places/bachho.js';
import { rng, along, widthAt, readRoads, mkPath, seek, place, chain, clipRuns, placeById, truongTienFrame, RAIL_BRIDGE_TOP, ON_GROUND, tmp } from './paths.js';

// ---------- street lamps, pedestrians, the train ----------

export function buildStreetLife(data, group) {
  const updates = [];
  const parts = [buildLampPosts, buildPedestrians, buildTrain];
  for (const build of parts) {
    try {
      const u = build(data, group);
      if (u) updates.push(u);
    } catch (e) {
      console.warn('street life: skipped', build.name, e); // one missing data field should not take the city down
    }
  }
  return { update(dt, time) { dt = Math.min(dt, 0.1); for (const u of updates) u(dt, time); } };
}

// Lamp posts. Real: each stands where geo/city.js puts a night-time glow (every 30–36 m along OSM class 0–2
// streets, alternating sides), so the glow sits in the lantern. Illustrative: the post design.
// To stay inside the triangle budget only the posts nearest the centre and the Citadel are built
// (LAMP_MAX); glows further out keep shining without a post.
const LAMP_MAX = () => (quality.low ? 800 : 3000);
function buildLampPosts(data, group) {
  const roads = readRoads(data);
  const profiles = bridgeProfiles(data);
  const kd = placeById(data).get('kydai') || [0, 0];
  const ARM = 0.9; // pole stands this far behind the lantern, away from the carriageway
  const spots = [];
  const dv = replaced('bachho') ? daVienRoads(data) : null; // cầu Dã Viên's deck has its own parapet lamps (places/bachho.js)
  for (const r of roads) {
    if (r.c > 2 || r.unmarked || r.pts.length < 2 || (r.bridge && dv && dv.has(r.flat))) continue;
    const PL = r.bridge && profiles.get(r.flat);
    if (PL && PL.lamps && replaced(PL.lamps.own)) continue; // the bridge's own posts, drawn by its place file (bridges.js bridgeLamps)
    const step = r.c === 0 ? 30 : 36;
    for (let s = step / 2, k = 0; s < r.len; s += step, k++) {
      const { p, a } = along(r.pts, s);
      const side = k % 2 ? 1 : -1, off = ((r.ws ? widthAt(r.pts, r.ws, p) : r.w) / 2 + 0.5) * side;
      const lx = p[0] - Math.sin(a) * off, lz = p[1] + Math.cos(a) * off;
      if (ownLit(data, lx, lz)) continue; // a bridge with its own lamps (geo/bridges.js `lit`): no post beside them
      const baseY = PL ? PL.y(s) : r.bridge ? Math.max(BRIDGE_TOP, LAND_Y + rise(lx, lz)) : LAND_Y + rise(lx, lz);
      const glowY = PL ? PL.y(s) + 7.58 : LAND_Y + rise(lx, lz) + (r.bridge ? 8 : 7.5);
      const ox = -Math.sin(a) * side, oz = Math.cos(a) * side; // outward, away from the road
      const far = Math.min(Math.hypot(lx, lz), Math.hypot(lx - kd[0], lz - kd[1]));
      spots.push([lx, lz, baseY, (glowY - baseY) / 7.5, Math.atan2(-oz, ox), far]);
    }
  }
  if (!spots.length) return null;
  spots.sort((a, b) => a[5] - b[5]);
  if (spots.length > LAMP_MAX()) spots.length = LAMP_MAX();
  // 14 triangles: three-sided pole, a ridged arm, an inverted lantern whose centre is 7.5 m up
  const geo = new Buf(16);
  const dark = hex('#3a4641'), glass = hex('#f2e6c4');
  geo.cyl(ARM, 0, 0, 7.8, 0.11, 0.06, 3, dark, { cap: false });
  geo.quad([ARM, 7.85, 0], [-0.05, 7.8, 0], [-0.05, 7.7, -0.07], [ARM, 7.75, -0.07], dark, [0, 1, -1]);
  geo.quad([ARM, 7.85, 0], [-0.05, 7.8, 0], [-0.05, 7.7, 0.07], [ARM, 7.75, 0.07], dark, [0, 1, 1]);
  const ring = [0, 1, 2].map((k) => [Math.cos((k * 2 * Math.PI) / 3) * 0.27, 7.7, Math.sin((k * 2 * Math.PI) / 3) * 0.27]);
  for (let k = 0; k < 3; k++) {
    const a = ring[k], b = ring[(k + 1) % 3];
    geo.tri(a, b, [0, 7.28, 0], glass, [a[0] + b[0], -0.4, a[2] + b[2]]);
  }
  geo.tri(ring[0], ring[1], ring[2], dark, [0, 1, 0]);
  const mesh = new THREE.InstancedMesh(geo.geometry(), cityMaterial(), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z, y, k, yaw], i) => {
    q.setFromAxisAngle(up, yaw); p.set(x, y, z); s.set(1, k, 1);
    mesh.setMatrixAt(i, m.compose(p, q, s));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = !quality.low;
  mesh.layers.set(1);
  group.add(mesh);
  return null;
}

// Pedestrians. Real: where they walk — the OSM streets around Phố đi bộ Nguyễn Đình Chiểu, chợ Đông Ba, Phố Tây,
// the Ngọ Môn square, Phu Văn Lâu, Ga Huế and Quốc Học, the walkways of Trường Tiền, and the pavements of the
// central class 0–2 streets. Illustrative: the people, their numbers, clothes (áo dài, nón lá) and the short
// straight promenades laid where no mapped street fits.
function buildPedestrians(data, group) {
  const rnd = rng(1945);
  const roads = readRoads(data).filter((r) => !r.bridge && r.pts.length >= 2);
  const places = placeById(data);
  const onLand = landTest(data, { ponds: true });
  const tt = truongTienFrame(data);
  const N = quality.low ? 300 : 900;

  // a pedestrian path keeps how far from its centreline people walk
  const roadPath = (pts, c, w = ROAD_W[c]) => {
    const p = mkPath(pts);
    if (c <= 2) { p.pav = w / 2 + 1.5; p.half = 0.4; } // on the pavements
    else { p.pav = 0; p.half = Math.max(0.3, w / 2 - 0.4); } // lanes and walking streets: anywhere across
    return p;
  };
  const freePath = (pts, half = 2.5) => { const p = mkPath(pts); p.pav = 0; p.half = half; return p; };
  const roadsNear = (cx, cz, r, maxC = 5) => {
    const out = [], r2 = r * r;
    for (const rd of roads) {
      if (rd.c > maxC || rd.x1 < cx - r || rd.x0 > cx + r || rd.z1 < cz - r || rd.z0 > cz + r) continue;
      for (const run of clipRuns(rd.pts, (x, z) => (x - cx) ** 2 + (z - cz) ** 2 < r2, 5, 14)) out.push(roadPath(run, rd.c, rd.w));
    }
    return out;
  };
  // a straight promenade through (cx, cz) along (ux, uz), kept to dry land
  const promenade = (cx, cz, ux, uz, half, width = 2.5) => {
    const runs = clipRuns([[cx - ux * half, cz - uz * half], [cx + ux * half, cz + uz * half]], onLand, 4, 20);
    return runs.map((r) => freePath(r, width));
  };
  // the city grid around the river runs roughly along / across Trường Tiền
  const gx = tt ? tt.d : [0.73, 0.68], gn = tt ? tt.n : [-0.68, 0.73];

  const spots = []; // { paths, share, aodai }
  const P = (id) => places.get(id);
  if (P('ndchieu')) {
    const [x, z] = P('ndchieu');
    const paths = roadsNear(x, z, 220);
    // the riverside promenade: along the river (across the bridge axis), nudged toward the water if it is close
    let ox = 0, oz = 0;
    for (const sgn of [1, -1]) if (!onLand(x + gx[0] * 40 * sgn, z + gx[1] * 40 * sgn) && onLand(x + gx[0] * 12 * sgn, z + gx[1] * 12 * sgn)) { ox = gx[0] * 12 * sgn; oz = gx[1] * 12 * sgn; break; }
    paths.push(...promenade(x + ox, z + oz, gn[0], gn[1], 200, 3));
    spots.push({ paths, share: 0.17, aodai: 0.3 });
  }
  if (tt) spots.push({ paths: [-1, 1].map((sd) => { const p = tt.lane(sd * tt.walkOff, 0.12); p.pav = 0; p.half = 0.5; return p; }), share: 0.07, aodai: 0.3, noGroups: true });
  if (P('dongba')) spots.push({ paths: roadsNear(...P('dongba'), 170), share: 0.14, aodai: 0.15 });
  if (P('photay')) spots.push({ paths: roadsNear(...P('photay'), 200), share: 0.15, aodai: 0.08 });
  if (P('kydai') && P('ngomon')) {
    // the esplanade between Kỳ Đài and Ngọ Môn: three walks along it and one across
    const [ax, az] = P('kydai'), [bx, bz] = P('ngomon');
    const dl = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / dl, uz = (bz - az) / dl;
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const paths = roadsNear(cx, cz, dl * 0.6, 3);
    for (const o of [-28, 0, 28]) paths.push(...promenade(cx - uz * o, cz + ux * o, ux, uz, dl * 0.34, 4));
    paths.push(...promenade(cx, cz, -uz, ux, 45, 4));
    spots.push({ paths, share: 0.12, aodai: 0.35 });
  }
  if (P('phuvanlau')) {
    // the river bank in front of the Citadel, Phu Văn Lâu to Nghênh Lương Đình
    const [ax, az] = P('phuvanlau');
    const paths = roadsNear(ax, az, 130, 3);
    if (P('nghenhluong')) {
      const [bx, bz] = P('nghenhluong'), dl = Math.hypot(bx - ax, bz - az) || 1;
      paths.push(...promenade((ax + bx) / 2, (az + bz) / 2, (bx - ax) / dl, (bz - az) / dl, dl / 2 + 90, 3));
    }
    spots.push({ paths, share: 0.05, aodai: 0.3 });
  }
  if (P('gahue')) spots.push({ paths: roadsNear(...P('gahue'), 110), share: 0.03, aodai: 0.1 });
  if (P('quochoc')) spots.push({ paths: roadsNear(...P('quochoc'), 110), share: 0.03, aodai: 0.6 }); // students in white áo dài
  // thinner along the pavements of the main streets in the centre and the Citadel
  const ctr = [[0, 0, 1500]];
  if (P('kydai')) ctr.push([P('kydai')[0], P('kydai')[1] - 300, 1000]);
  const pave = [];
  for (const rd of roads) {
    if (rd.c > 2) continue;
    for (const run of clipRuns(rd.pts, (x, z) => ctr.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < r * r), 8, 30)) {
      pave.push(roadPath(run, rd.c, rd.w));
    }
  }
  spots.push({ paths: pave, share: 0.24, aodai: 0.12 });

  const live = spots.filter((s) => s.paths.length && s.paths.some((p) => p.len > 1));
  if (!live.length) return null;
  const shareSum = live.reduce((t, s) => t + s.share, 0);

  const AODAI = ['#f6f3ec', '#f6f3ec', '#7b4a9e', '#9566b8', '#b5cfe5', '#e6d6ee'].map(hex); // white, Huế violet, pale blue
  const EVERY = ['#2f3e5a', '#b8392f', '#e3d7bc', '#55744a', '#38383c', '#d48a3a', '#8fb1c8', '#efebe3', '#6e4b3a', '#c7c2b6', '#4d6a8a'].map(hex);
  const people = []; // { path, s, dir, lat, speed, phase, turn, wait, go, seg, aodai, hat, still, x, y, z, yaw }
  for (const spot of live) {
    const n = Math.round((N * spot.share) / shareSum);
    const paths = spot.paths.filter((p) => p.len > 1);
    const cum = []; let tot = 0;
    for (const p of paths) { tot += p.len; cum.push(tot); }
    const pick = () => { const r = rnd() * tot; for (let i = 0; i < cum.length; i++) if (r <= cum[i]) return paths[i]; return paths[paths.length - 1]; };
    const lateral = (p) => (p.pav ? (rnd() < 0.5 ? -1 : 1) * (p.pav + (rnd() - 0.5) * 2 * p.half) : (rnd() * 2 - 1) * p.half);
    const dress = () => { const aodai = rnd() < spot.aodai; return { aodai, hat: rnd() < (aodai ? 0.65 : 0.3) }; };
    let left = n;
    // a few stand about in small groups — chatting outside a shop, waiting to cross
    if (!spot.noGroups) {
      let still = Math.round(n * 0.12);
      while (still >= 3) {
        const k = Math.min(still, 3 + Math.floor(rnd() * 3));
        const p = pick(), s = rnd() * p.len, seg = seek(p, s, 1);
        place(p, s, seg, lateral(p), tmp);
        const cx = tmp.x, cz = tmp.z;
        for (let j = 0; j < k; j++) {
          const a = (j / k) * Math.PI * 2 + rnd() * 0.5, r = 0.55 + rnd() * 0.25;
          const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
          people.push({ still: true, x, z, y: LAND_Y + rise(x, z) + ON_GROUND, yaw: Math.atan2(Math.sin(a), -Math.cos(a)), ...dress() });
        }
        still -= k; left -= k;
      }
    }
    for (let i = 0; i < left; i++) {
      const p = pick();
      people.push({ still: false, path: p, s: rnd() * p.len, dir: rnd() < 0.5 ? 1 : -1, lat: lateral(p), speed: 0.9 + rnd() * 0.7, phase: rnd() * 6.28, turn: 0, wait: 0, go: 20 + rnd() * 120, seg: 1, ...dress() });
    }
  }
  if (!people.length) return null;

  // a person, feet at 0, about 1.8 m to the hat tip; body and head are separate meshes so clothes can be
  // coloured per person without tinting faces
  const body = new Buf(20); // 16 triangles: legs (or the lower áo dài panels) and a torso tapering to the neck
  body.cyl(0, 0, 0, 0.8, 0.1, 0.16, 4, [0.72, 0.72, 0.72], { cap: false, rot: Math.PI / 4 });
  body.cyl(0, 0, 0.8, 1.45, 0.17, 0.1, 4, [1, 1, 1], { cap: false, rot: Math.PI / 4 });
  const skin = hex('#c99a74'), straw = hex('#e4d6a8'), hair = hex('#1e1917');
  const hatHead = new Buf(16); // 14 triangles: head and a conical nón lá
  hatHead.cyl(0, 0, 1.43, 1.64, 0.1, 0.095, 4, skin, { cap: false, rot: Math.PI / 4 });
  hatHead.cyl(0, 0, 1.6, 1.84, 0.34, 0, 6, straw, { cap: false });
  const bareHead = new Buf(16); // 12 triangles: head and dark hair
  bareHead.cyl(0, 0, 1.43, 1.62, 0.1, 0.1, 4, skin, { cap: false, rot: Math.PI / 4 });
  bareHead.cyl(0, 0, 1.62, 1.71, 0.105, 0, 4, hair, { cap: false, rot: Math.PI / 4 });

  const mat = cityMaterial();
  const mk = (geo, n) => {
    const mesh = new THREE.InstancedMesh(geo.geometry(), mat, Math.max(1, n));
    mesh.count = n;
    mesh.castShadow = !quality.low;
    mesh.frustumCulled = false;
    mesh.layers.set(1);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    return mesh;
  };
  people.forEach((w) => {
    const pal = w.aodai ? AODAI : EVERY;
    w.col = shade(pal[Math.floor(rnd() * pal.length)], 0.88 + rnd() * 0.12);
    w.headCol = shade([1, 1, 1], 0.86 + rnd() * 0.14);
  });
  const nHat = people.filter((w) => w.hat).length;
  const bodies = mk(body, people.length), hats = mk(hatHead, nHat), bares = mk(bareHead, people.length - nHat);
  const c = new THREE.Color();

  const SCALE = 1.1; // a touch over life size so they read from the usual viewing distance
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(SCALE, SCALE, SCALE), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // those standing still are written once; the per-frame loop only visits walkers
  const walkers = [];
  let nh = 0, nr = 0;
  people.forEach((w, i) => {
    w.i = i;
    w.head = w.hat ? hats : bares;
    w.j = w.hat ? nh++ : nr++;
    bodies.setColorAt(w.i, enc(w.col, c));
    w.head.setColorAt(w.j, enc(w.headCol, c));
    if (w.still) {
      q.setFromAxisAngle(up, w.yaw); p.set(w.x, w.y, w.z);
      m.compose(p, q, sc);
      bodies.setMatrixAt(w.i, m); w.head.setMatrixAt(w.j, m);
    } else walkers.push(w);
  });
  for (const mesh of [bodies, hats, bares]) {
    mesh.visible = mesh.count > 0;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  const TURN = 0.8, pmeshes = [bodies, hats, bares];
  const update = (dt) => {
    if (!bodies.visible) return;
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i];
      let moving = false;
      if (w.wait > 0) w.wait -= dt; // stopped to look at something
      else if (w.turn > 0) w.turn = Math.max(0, w.turn - dt);
      else {
        const d = w.speed * dt;
        w.s += w.dir * d; w.go -= d; w.phase += d * 4.8; moving = true;
        if (w.s > w.path.len) { w.s = w.path.len; w.dir = -1; w.turn = TURN; } else if (w.s < 0) { w.s = 0; w.dir = 1; w.turn = TURN; } else if (w.go < 0) { w.go = 25 + rnd() * 110; w.wait = 1.5 + rnd() * 6; }
      }
      w.seg = seek(w.path, w.s, w.seg);
      place(w.path, w.s, w.seg, w.lat, tmp);
      const yaw = Math.atan2(-tmp.dz * w.dir, tmp.dx * w.dir) + (w.turn > 0 ? (Math.PI * w.turn) / TURN : 0) + (moving ? Math.sin(w.phase) * 0.06 : 0);
      q.setFromAxisAngle(up, yaw);
      p.set(tmp.x, tmp.y + (moving ? Math.abs(Math.sin(w.phase)) * 0.045 : 0), tmp.z);
      m.compose(p, q, sc);
      bodies.setMatrixAt(w.i, m);
      w.head.setMatrixAt(w.j, m);
    }
    for (let k = 0; k < 3; k++) if (pmeshes[k].visible) pmeshes[k].instanceMatrix.needsUpdate = true; // no upload while hidden
  };
  update(0);
  return update;
}

// The train. Real: the track (the OSM main line through Huế, joined into one run, over cầu Bạch Hổ at deck
// height) and the stop at Ga Huế. Illustrative: the locomotive, six carriages, the timetable — it shuttles
// back and forth, slowing into the station and standing there ~20 s.
function buildTrain(data, group) {
  const lines = [];
  for (const r of data.rails || []) {
    if (!Array.isArray(r) || !Array.isArray(r[2]) || r[2].length < 4 || !r[0]) continue;
    const pts = unflat(r[2]);
    lines.push({ pts, len: pathLength(pts), c: 0, h: r[1] ? RAIL_BRIDGE_TOP : NaN });
  }
  if (!lines.length) return null;
  const chains = chain(lines, 3, () => true);
  const track = chains.reduce((a, b) => (b.len > a.len ? b : a), chains[0]);
  const UNITS = [16, 20, 20, 20, 20, 20, 20], GAP = 1; // locomotive first, at the high-arc end
  const LT = UNITS.reduce((t, l) => t + l, 0) + GAP * (UNITS.length - 1);
  if (!track || track.len < LT + 100) return null;
  const offs = []; // centre of each unit, measured back from the train's front
  for (let k = 0, o = 0; k < UNITS.length; k++) { offs.push(o + UNITS[k] / 2); o += UNITS[k] + GAP; }

  // the station: where the track passes closest to Ga Huế
  let sst = -1;
  const gh = placeById(data).get('gahue');
  if (gh) {
    let best = 300;
    for (let i = 1; i < track.pts.length; i++) {
      const a = track.pts[i - 1], b = track.pts[i], l = track.acc[i] - track.acc[i - 1];
      if (l < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((gh[0] - a[0]) * (b[0] - a[0]) + (gh[1] - a[1]) * (b[1] - a[1])) / (l * l)));
      const d = Math.hypot(a[0] + (b[0] - a[0]) * t - gh[0], a[1] + (b[1] - a[1]) * t - gh[1]);
      if (d < best) { best = d; sst = track.acc[i - 1] + t * l; }
    }
    if (sst >= 0) sst = Math.max(LT / 2 + 1, Math.min(track.len - LT / 2 - 1, sst)); // the whole train must fit
  }

  // unit-length carriage (scaled along x per unit): underframe, body, roof — 30 triangles
  const geo = new Buf(36);
  geo.box(0, 0, 0.3, 0.75, 1, 2.2, 0, [0.22, 0.22, 0.22]);
  geo.box(0, 0, 0.75, 3.6, 1, 2.9, 0, [1, 1, 1]);
  geo.box(0, 0, 3.6, 3.85, 0.98, 2.5, 0, [0.62, 0.62, 0.6]);
  const mesh = new THREE.InstancedMesh(geo.geometry(), cityMaterial(), UNITS.length);
  const c = new THREE.Color();
  UNITS.forEach((_, k) => mesh.setColorAt(k, enc(hex(k === 0 ? '#b8462f' : k % 2 ? '#2f5f8f' : '#33658f'), c)));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = !quality.low;
  mesh.frustumCulled = false;
  mesh.layers.set(1);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);

  const st = { front: sst > 0 ? sst + LT / 2 : LT + 40, dir: 1, wait: sst > 0 ? 6 : 0, served: sst > 0 };
  const segA = new Int32Array(UNITS.length).fill(1), segB = new Int32Array(UNITS.length).fill(1);
  const A = { x: 0, y: 0, z: 0, dx: 1, dz: 0 }, B = { x: 0, y: 0, z: 0, dx: 1, dz: 0 };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YZX'), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const VMAX = 10;
  let placed = false;
  const update = (dt) => {
    if (st.wait > 0) {
      st.wait -= dt;
      if (placed) return;
    } else {
      const mid = st.front - LT / 2;
      const v = sst > 0 ? VMAX * Math.max(0.12, Math.min(1, Math.abs(mid - sst) / 260)) : VMAX;
      const before = (sst - mid) * st.dir;
      st.front += st.dir * v * dt;
      const after = (sst - (st.front - LT / 2)) * st.dir;
      if (st.served && Math.abs(mid - sst) > 50) st.served = false;
      if (sst > 0 && !st.served && before > 0 && after <= 0) { st.front = sst + LT / 2; st.wait = 20; st.served = true; }
      // at the ends of the line it reverses (push-pull), after a pause
      if (st.front > track.len) { st.front = track.len; st.dir = -1; st.wait = 10; } else if (st.front - LT < 0) { st.front = LT; st.dir = 1; st.wait = 10; }
    }
    placed = true;
    for (let k = 0; k < UNITS.length; k++) {
      const cs = st.front - offs[k], h = UNITS[k] * 0.36; // bogie centres
      segA[k] = seek(track, cs - h, segA[k]); segB[k] = seek(track, cs + h, segB[k]);
      place(track, cs - h, segA[k], 0, A); place(track, cs + h, segB[k], 0, B);
      const dx = B.x - A.x, dz = B.z - A.z;
      e.set(0, Math.atan2(-dz, dx), Math.atan2(B.y - A.y, Math.hypot(dx, dz)));
      q.setFromEuler(e);
      p.set((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
      sc.set(UNITS[k], 1, 1);
      mesh.setMatrixAt(k, m.compose(p, q, sc));
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return update;
}
