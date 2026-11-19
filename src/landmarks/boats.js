import * as THREE from 'three';
import { Buf, hex, unflat } from '../geo/buf.js';
import { cityMaterial } from '../geo/materials.js';

// Thuyền rồng — the dragon boats that work the Hương. Local +x is the bow.
function dragonBoatGeometry() {
  const B = new Buf(400);
  const yellow = hex('#e8b530'), red = hex('#b8322a'), green = hex('#2f7d5c'), wood = hex('#7a5136'), cream = hex('#efe2c2');
  const hull = [[-10, -1.6], [-7.5, -2.1], [6, -2.1], [10.2, 0], [6, 2.1], [-7.5, 2.1], [-10, 1.6]];
  B.prism(hull, -0.4, 0.95, wood, hex('#a98a64'), { scaleTop: 1.04 });
  B.prism(hull.map(([x, z]) => [x * 0.99, z * 1.06]), 0.75, 1.0, red, red, { top: false });
  // cabin and roof
  B.box(-2.6, 0, 0.95, 2.75, 10.4, 3.3, 0, cream, { top: red });
  for (let x = -7.2; x <= 2.2; x += 1.9) B.box(x, 0, 0.95, 2.75, 0.24, 3.42, 0, red);
  B.hip(-2.6, 0, 11.6, 3.9, 0, 2.75, 0.95, yellow, { flare: 0.28, over: 0.2, ridgeCol: red });
  B.box(-2.6, 0, 3.3, 3.75, 4.4, 1.7, 0, green);
  B.hip(-2.6, 0, 5.2, 2.3, 0, 3.75, 0.6, yellow, { flare: 0.2 });
  // dragon: arched neck and head at the bow, tail at the stern
  B.beam([8.0, 0.95, 0], [9.5, 1.5, 0], 0.46, 0.5, yellow);
  B.beam([9.5, 1.5, 0], [10.3, 2.3, 0], 0.4, 0.44, yellow);
  B.beam([10.3, 2.3, 0], [11.5, 2.2, 0], 0.5, 0.42, red);
  B.beam([11.5, 2.2, 0], [12.0, 2.0, 0], 0.34, 0.26, yellow);
  B.beam([10.5, 2.5, 0.16], [9.9, 3.0, 0.34], 0.08, 0.08, yellow);
  B.beam([10.5, 2.5, -0.16], [9.9, 3.0, -0.34], 0.08, 0.08, yellow);
  for (let i = 0; i < 3; i++) B.beam([8.4 + i * 0.6, 1.3 + i * 0.3, 0], [8.5 + i * 0.6, 1.75 + i * 0.3, 0], 0.07, 0.3, green);
  B.beam([-9.4, 0.9, 0], [-11.0, 2.3, 0], 0.44, 0.44, yellow);
  B.beam([-11.0, 2.3, 0], [-11.5, 3.3, 0], 0.3, 0.3, red);
  return B.geometry();
}

// Projects pts onto arc length for constant-speed travel along the mapped river centre line.
function makeTrack(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc[acc.length - 1];
  return {
    total,
    at(s) {
      s = Math.max(0, Math.min(total, s));
      let i = 1;
      while (i < acc.length - 1 && acc[i] < s) i++;
      const a = pts[i - 1], b = pts[i];
      const t = (s - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      return { x: a[0] + dx * t, z: a[1] + dz * t, tx: dx / l, tz: dz / l };
    },
  };
}

// A small sampan with a woven arched roof, the kind tied up along the banks. Local +x is the bow.
function sampanGeometry() {
  const B = new Buf(64);
  const wood = hex('#5f4433'), deck = hex('#8a6a4c'), mat = hex('#b89a6a'), matD = hex('#9a7f55');
  const hull = [[-4.2, 0], [-3, -0.85], [2.6, -0.85], [4.4, 0], [2.6, 0.85], [-3, 0.85]];
  B.prism(hull, -0.25, 0.45, wood, deck, { scaleTop: 1.08 });
  // arched roof in five facets
  const x0 = -2.2, x1 = 1.2, r = 0.95;
  for (let i = 0; i < 5; i++) {
    const a0 = (i / 5) * Math.PI, a1 = ((i + 1) / 5) * Math.PI;
    const p0 = [Math.cos(a0) * r, 0.45 + Math.sin(a0) * r * 0.95], p1 = [Math.cos(a1) * r, 0.45 + Math.sin(a1) * r * 0.95];
    B.quad([x0, p0[1], p0[0]], [x1, p0[1], p0[0]], [x1, p1[1], p1[0]], [x0, p1[1], p1[0]], i % 2 ? mat : matD, [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)]);
  }
  return B.geometry();
}

export function buildBoats(data, group) {
  const geo = dragonBoatGeometry();
  const mat = cityMaterial();
  // sampans at the moorings
  const mo = data.moorings || [];
  if (mo.length) {
    const im = new THREE.InstancedMesh(sampanGeometry(), mat, mo.length / 3);
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), ss = new THREE.Vector3(), pp = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < mo.length / 3; i++) {
      const k = 0.85 + ((i * 37) % 10) / 25;
      qq.setFromAxisAngle(up, -mo[i * 3 + 2] / 1000 + (i % 2 ? Math.PI : 0));
      pp.set(mo[i * 3] / 10, 0, mo[i * 3 + 1] / 10); ss.set(k, k, k);
      im.setMatrixAt(i, m4.compose(pp, qq, ss));
    }
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = true;
    im.frustumCulled = false;
    group.add(im);
  }
  const make = () => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; group.add(m); return m; };

  // keep traffic on the stretch between Cồn Dã Viên and the head of Cồn Hến
  const all = unflat(data.river);
  const pts = all.filter((p) => p[0] > -2300 && p[0] < 700 && p[1] > -700 && p[1] < 1500);
  const track = pts.length > 2 ? makeTrack(pts) : null;
  const fleet = [];
  if (track) {
    const n = 5;
    for (let i = 0; i < n; i++) fleet.push({ mesh: make(), s: (track.total * (i + 0.5)) / n, dir: i % 2 ? 1 : -1, speed: 3.2 + (i % 3) * 0.9, lane: 26 + (i % 3) * 16, phase: i * 1.7 });
  }
  const rideBoat = make();
  rideBoat.visible = false;

  return {
    rideBoat,
    update(dt, time) {
      for (const b of fleet) {
        b.s += b.dir * b.speed * dt;
        if (b.s > track.total - 5) { b.s = track.total - 5; b.dir = -1; }
        if (b.s < 5) { b.s = 5; b.dir = 1; }
        const p = track.at(b.s);
        const tx = p.tx * b.dir, tz = p.tz * b.dir;
        // keep right
        b.mesh.position.set(p.x - tz * b.lane, Math.sin(time * 0.9 + b.phase) * 0.06, p.z + tx * b.lane);
        b.mesh.rotation.set(Math.sin(time * 0.7 + b.phase) * 0.012, Math.atan2(-tz, tx), 0);
      }
    },
  };
}
