// Builds the whole scene headless (scripts/lib/scene.mjs) and fails where a boat runs into a structure: a bridge deck
// or pier, a quay, a boardwalk, a landing. Two kinds of boat:
//   moored   the sampans tied up along the banks (data.moorings, drawn by buildBoats as one InstancedMesh)
//   fleet    the dragon boats working the Hương: buildBoats' update is stepped through a whole round trip of every
//            boat (the turns at both ends included) and each pose is tested
// The test is geo/clearance.js, the one the fleet's routing uses: the hull's box from just above the waterline to its
// roof against every static face (the shared buffer, and the meshes of every builder that is not moving life),
// clipped exactly, so a deck passing overhead with clearance or a pier beside the hull does not count.
// Run: npm run check:boats  (--all lists every hit)
import * as THREE from 'three';
import { buildScene } from '../lib/scene.mjs';
import { makeObstacles } from '../../src/geo/clearance.js';
import { buildBoats } from '../../src/landmarks/boats.js';

const DT = 0.5; // seconds between tested fleet poses (≤ 2.5 m of travel at the fleet's top speed)
const showAll = process.argv.includes('--all');

const t0 = Date.now();
const { data, S, sources, errors } = await buildScene();
const MOVING = new Set(['boats', 'lanterns', 'lotus', 'traffic', 'street']);

// ---- every static face, tagged with the builder (or replica) that made it ----
const obs = makeObstacles();
{
  const tagOf = new Array(Math.ceil(S.n / 3)).fill('city');
  for (const s of sources) for (let i = s.range[0]; i < s.range[1]; i += 3) tagOf[i / 3] = s.name;
  for (let i = 0; i + 2 < S.n; i += 3) obs.add(S.pos, tagOf[i / 3], i * 3);
  const a = new THREE.Vector3(), m4 = new THREE.Matrix4(), mi = new THREE.Matrix4(), v = new Float32Array(9);
  for (const s of sources) {
    if (MOVING.has(s.name)) continue;
    for (const r of s.objs) {
      r.updateMatrixWorld(true);
      r.traverse((o) => {
        const p = o.geometry?.attributes?.position;
        if (!p || !o.isMesh || /^(land|terrain|base|water|river)/.test(o.name) || /trees/.test(o.name)) return;
        const idx = o.geometry.index, nt = Math.floor((idx ? idx.count : p.count) / 3), id = (j) => (idx ? idx.getX(j) : j);
        const tag = s.name + (o.name ? ':' + o.name : '');
        for (let q = 0; q < (o.isInstancedMesh ? o.count : 1); q++) {
          if (o.isInstancedMesh) { o.getMatrixAt(q, mi); m4.multiplyMatrices(o.matrixWorld, mi); } else m4.copy(o.matrixWorld);
          for (let t = 0; t < nt; t++) {
            for (let k = 0; k < 3; k++) { a.fromBufferAttribute(p, id(t * 3 + k)).applyMatrix4(m4); v[k * 3] = a.x; v[k * 3 + 1] = a.y; v[k * 3 + 2] = a.z; }
            obs.add(v, tag);
          }
        }
      });
    }
  }
}

const report = []; // { kind, x, z, what }
const place = (x, z) => { let best = '', bd = Infinity; for (const p of data.places || []) { const d = Math.hypot(p.x / 10 - x, p.z / 10 - z); if (d < bd) { bd = d; best = p.n; } } return best ? ` near ${best} (${bd.toFixed(0)} m)` : ''; };
const summary = (found) => [...new Set(found.map((f) => f.tag))].join(', ') + `, up to y ${Math.max(...found.map((f) => f.y)).toFixed(1)}`;
const boxOf = (geo) => { geo.computeBoundingBox(); return [geo.boundingBox.min.toArray(), geo.boundingBox.max.toArray()]; };

// ---- the fleet and the moorings, built again on their own, with the handle buildLandmarks returns ----
const g = new THREE.Group(), fleet = buildBoats(data, g, S);

// the moored sampans
let nMoored = 0;
const im = g.children.find((o) => o.isInstancedMesh);
if (im) {
  const [lo, hi] = boxOf(im.geometry), mi = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), e = new THREE.Euler();
  for (let i = 0; i < im.count; i++, nMoored++) {
    im.getMatrixAt(i, mi); mi.decompose(p, q, sc); e.setFromQuaternion(q, 'YXZ');
    const found = obs.hits(p.x, p.z, e.y, lo, hi, sc.x);
    if (found.length) report.push({ kind: 'moored sampan', x: p.x, z: p.z, what: summary(found) });
  }
} else if ((data.moorings || []).length >= 3) errors.push('no moored sampans built');

// the dragon boats, a round trip of the slowest (3.2 m/s) over the ≤ 3.5 km track
let nPoses = 0;
const boats = g.children.filter((o) => o.isMesh && !o.isInstancedMesh && o.name !== 'wake');
if (boats.length) {
  const [lo, hi] = boxOf(boats[0].geometry), seen = new Set();
  for (let k = 0, steps = Math.ceil((2 * 3500) / 3.2 / DT); k < steps; k++) {
    fleet.update(DT, k * DT);
    boats.forEach((m, j) => {
      nPoses++;
      const found = obs.hits(m.position.x, m.position.z, m.rotation.y, lo, hi);
      const key = j + ':' + Math.round(m.position.x / 40) + ',' + Math.round(m.position.z / 40); // one report per boat and spot
      if (!found.length || seen.has(key)) return;
      seen.add(key);
      report.push({ kind: `dragon boat ${j}`, x: m.position.x, z: m.position.z, what: summary(found) });
    });
  }
} else if (data.river) errors.push('no dragon boats built');

for (const r of report.slice(0, showAll ? report.length : 12)) console.log(`FAIL ${r.kind} at (${r.x.toFixed(1)}, ${r.z.toFixed(1)})${place(r.x, r.z)}: ${r.what}`);
if (report.length > 12 && !showAll) console.log(`     … ${report.length - 12} more (--all)`);
for (const e of errors) console.log('FAIL ' + e);
const bad = report.length + errors.length;
console.log(bad ? `boats: ${report.length} boat(s) run into a structure` : `boats: ok, ${nMoored} moored sampans and ${nPoses} dragon-boat poses clear of every structure (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
process.exit(bad ? 1 : 0);
