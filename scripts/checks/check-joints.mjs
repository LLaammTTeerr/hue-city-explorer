// Builds the whole scene headless (scripts/lib/scene.mjs) and checks every bridge-to-street joint: where a deck ends
// and the street carries on, the two must meet edge to edge.
//   bare   ground showing in the seam: points just past the deck's end, across its paved width, that no carriageway,
//          pavement, median or deck covers (a wedge left by an end cut at an angle, a street that stops short);
//   step   the deck's surface just inside its end against the street's just outside, across the carriageway: a
//          ramp that does not come down to the street, or a deck end standing in the air.
// Joints: every generated bridge deck (geo/city.js, class 0-3, not a citadel vault) at each end where a street
// starts, and every replica's deck end (places/*.js deckEnds: cầu Nguyễn Hoàng, cầu Phú Xuân).
// Run: npm run check:joints   (--all lists every joint, not only the failures)
import { buildScene } from '../lib/scene.mjs';

const OUT = [0.3, 1.0]; // m past the end line: the seam samples
const IN = 0.3; // m inside it: the deck's own surface
const DT = 0.25; // m between samples across the deck
const EDGE = 0.35; // m left out at each side (the parapet, the kerb's edge)
const BARE_MAX = 0.5; // m² of bare seam per joint
const STEP_MAX = 0.35; // m between deck and street across the carriageway
const showAll = process.argv.includes('--all');

const { data, world, S, errors, groundY } = await buildScene();
const { bridgeProfiles, subPath } = await import('../../src/geo/bridges.ts');
const { placeDeckEnds, replaced } = await import('../../src/landmarks/places/index.ts');
const { ownRoads: giaHoiRoads } = await import('../../src/landmarks/places/giahoi.ts');
const { thuyTienBridgeRoads } = await import('../../src/landmarks/thuytien.ts');
const { roadWidth } = await import('../../src/config.ts');
const unflat = (f) => { const p = []; for (let i = 0; i + 1 < f.length; i += 2) p.push([f[i] / 10, f[i + 1] / 10]); return p; };

// ---- the joints: { name, p (on the axis at the end), u (out of the deck), hwPave, hwCar }
const joints = [];
const profiles = bridgeProfiles(data), ownTT = thuyTienBridgeRoads(data), ownGH = replaced('giahoi') ? giaHoiRoads(data) : new Set();
const streetEnds = [];
for (const r of data.roads) if (!r[1] && (r[0] | 0) <= 3) { const f = r[2]; streetEnds.push([f[0] / 10, f[1] / 10], [f[f.length - 2] / 10, f[f.length - 1] / 10]); }
const meetsStreet = (p) => streetEnds.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.5);
const tangent = (pts, i, j) => { const a = pts[i], b = pts[j], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
data.roads.forEach((r, i) => {
  const c = r[0] | 0;
  if (r[1] !== 1 || c > 3 || ownTT.has(r[2]) || ownGH.has(r[2])) return;
  const P = profiles.get(r[2]);
  if (!P || P.citadel || P.arches) return;
  if (P.name === 'Cầu Phú Xuân' && replaced('phuxuan')) return;
  if (P.name === 'Cầu Cửa Ngăn' || P.name === 'Đông Thành Thủy Quan') return;
  const w = roadWidth(r), pts = unflat(r[2]);
  const deck = P.span ? subPath(pts, P.span[0], P.span[1]) : pts;
  const n = deck.length, name = `road ${i}${P.name ? ' ' + P.name : ''}`;
  const hwPave = (w + (c <= 2 ? 3.6 : 2.4)) / 2;
  // the deck's start: a street starts there (or the way runs on as street past its abutment)
  if ((P.span && P.span[0] > 0.05) || meetsStreet(deck[0])) { const d = tangent(deck, 1, 0); joints.push({ name: name + ' start', p: deck[0], u: d, hwPave, hwCar: w / 2 }); }
  if ((P.span && P.span[1] < P.len - 0.05) || meetsStreet(deck[n - 1])) { const d = tangent(deck, n - 2, n - 1); joints.push({ name: name + ' end', p: deck[n - 1], u: d, hwPave, hwCar: w / 2 }); }
});
for (const e of placeDeckEnds(data)) joints.push({ name: `${e.id} end`, p: e.p, u: e.u, hwPave: e.hw, hwCar: e.hw });

// ---- samples, indexed by 1 m cell
const cells = new Map(), key = (x, z) => Math.floor(x) * 100003 + Math.floor(z);
const samples = [];
for (const [ji, J] of joints.entries()) {
  const nrm = [-J.u[1], J.u[0]];
  for (let t = -J.hwPave + EDGE; t <= J.hwPave - EDGE + 1e-6; t += DT) {
    for (const o of [-IN, ...OUT]) {
      const x = J.p[0] + J.u[0] * o + nrm[0] * t, z = J.p[1] + J.u[1] * o + nrm[1] * t;
      const s = { ji, t, o, x, z, g: groundY(x, z), top: -Infinity, ys: [] };
      samples.push(s);
      const k = key(x, z);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(s);
    }
  }
}
// every upward face over a sample: the roads overlay (carriageways, pavements, medians) and the structures
function scan(P, from, to) {
  for (let i = from; i + 2 < to; i += 3) {
    const k = i * 3;
    const ax = P[k], ay = P[k + 1], az = P[k + 2], bx = P[k + 3], by = P[k + 4], bz = P[k + 5], cx = P[k + 6], cy = P[k + 7], cz = P[k + 8];
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(ny) < 0.35 * Math.hypot(nx, ny, nz) || Math.abs(ny) < 1e-6) continue; // walls
    const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.floor(Math.max(ax, bx, cx)), z0 = Math.floor(Math.min(az, bz, cz)), z1 = Math.floor(Math.max(az, bz, cz));
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(det) < 1e-9) continue;
    const test = (s) => {
      const l1 = ((bz - cz) * (s.x - cx) + (cx - bx) * (s.z - cz)) / det, l2 = ((cz - az) * (s.x - cx) + (ax - cx) * (s.z - cz)) / det, l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) return;
      s.ys.push(l1 * ay + l2 * by + l3 * cy);
    };
    // a long straight street is one quad of two triangles (Võ Nguyên Giáp's carriageways run 226 m without a vertex):
    // walking its cells would take longer than testing every sample, so test the samples
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > samples.length) {
      for (const s of samples) if (s.x >= x0 && s.x < x1 + 1 && s.z >= z0 && s.z < z1 + 1) test(s);
      continue;
    }
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const list = cells.get(gx * 100003 + gz);
      if (list) for (const s of list) test(s);
    }
  }
}
for (const m of world.group.children) if (m.isMesh && m.renderOrder === 2) { const a = m.geometry.attributes.position; scan(a.array, 0, a.count); }
scan(S.pos, 0, S.n);

// ---- per joint
let fails = 0;
const rows = [];
for (const [ji, J] of joints.entries()) {
  const own = samples.filter((s) => s.ji === ji);
  let bare = 0, step = 0, stepAt = null;
  const seamArea = DT * (OUT[1] - 0) / OUT.length;
  for (const s of own) {
    if (s.o < 0) continue;
    // a surface at grade or on the deck's level (not an arch or a truss overhead)
    const inner = own.find((q) => q.o < 0 && Math.abs(q.t - s.t) < 1e-6);
    const deckY = inner ? Math.max(-Infinity, ...inner.ys.filter((y) => y < inner.g + 12)) : -Infinity;
    const lid = Math.max(s.g + 0.6, deckY + 0.6);
    const ys = s.ys.filter((y) => y > s.g - 0.6 && y < lid);
    if (!ys.length) { bare += seamArea; continue; }
    if (s.o === OUT[0] && Math.abs(s.t) <= J.hwCar - EDGE && deckY > -Infinity) {
      const d = deckY - Math.max(...ys);
      if (Math.abs(d) > Math.abs(step)) { step = d; stepAt = s.t; }
    }
  }
  const bad = bare > BARE_MAX || Math.abs(step) > STEP_MAX;
  if (bad) fails++;
  rows.push({ bad, line: `${bad ? 'FAIL' : 'ok  '} ${J.name.padEnd(48)} bare ${bare.toFixed(2).padStart(5)} m²  step ${step.toFixed(2).padStart(5)} m${stepAt !== null && Math.abs(step) > 0.05 ? ` (t ${stepAt.toFixed(1)})` : ''}  at ${J.p.map((v) => v.toFixed(1)).join(', ')}` });
}
for (const r of rows) if (showAll || r.bad) console.log(r.line);
for (const e of errors) console.log('error:', e);
console.log(`check-joints: ${joints.length} bridge-to-street joints, ${fails} failing (bare > ${BARE_MAX} m² or step > ${STEP_MAX} m)`);
process.exit(fails || errors.length ? 1 : 0);
