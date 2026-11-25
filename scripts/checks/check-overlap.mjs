// Builds the whole scene headless (scripts/lib/scene.mjs) and fails where models stand where something else is:
//   road      a landmark or replica raises a floor, step, landing, wall top or post (an upward face ROAD_LO..ROAD_HI
//             above the ground) inside a mapped carriageway, more than TOL in from its edge;
//   overlap   two sources (an older builder and a replica, or two replicas) both raise faces over the same ground;
//   building  a mapped building or an infill house that populate keeps stands on a model's raised ground.
// Each is summed per source (or pair) over 1 m cells and fails above its area limit, so contact passes: a gate pier
// at the kerb, a bridge ramp meeting its street, a replica's fence ending at a neighbour's wall. Overlap and building
// areas count only what interpenetrates by more than DEEP (see below), so faces that merely touch add nothing.
// Run: npm run check:overlap   (--all also lists what stays under the limits)
import { buildScene } from '../lib/scene.mjs';
import { owns as dainoiOwns } from '../../src/landmarks/places/dainoi.js';
import { placeOwns } from '../../src/landmarks/places/index.js';

const TOL = 0.5; // a face this far inside the carriageway's edge counts (kerbs, gate piers at the edge pass)
const ROAD_LO = 0.15, ROAD_HI = 5.0; // above this the face is overhead (an arch, a roof over the street)
const RAISED = 0.3; // a face this high over the ground is part of a model, not paving at grade
const LIMIT = { road: 2, overlap: 2, building: 2 }; // m² per source, pair or building (overlap and building count only interpenetration deeper than DEEP, so touching faces add nothing and a real one shows small)
const showAll = process.argv.includes('--all');

const t0 = Date.now();
const { data, tiles, world, S, sources, errors, groundY, ROAD_W } = await buildScene();
const key = (ix, iz) => (ix + 32768) * 65536 + (iz + 32768);
const unkey = (k) => [Math.floor(k / 65536) - 32768 + 0.5, (k % 65536) - 32768 + 0.5];

// ---- each source's raised ground: 1 m cell -> the highest of its upward faces there, over the ground ----
const SUB = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
const skip = new Set(['walls', 'populate', 'street']); // the rampart carries the gates; populate is checked against the rest
// the rampart and the other planted ground models mark as not cover (S.noCover): gates, Kỳ Đài and Quan Tượng Đài
// stand on it as they do at Huế
const noCover = S.noCover || [];
// Contact is not overlap. The cell raster below marks a cell for a source when any of its SUB points falls in one of
// its faces (with ~0.1 m slack), so two models that merely touch along a line both mark every 1 m cell the line
// crosses: one SUB point on each side. For the overlap and building tests each source also keeps a second, exact
// sample: for each SUB point, which of it and its four neighbours DEEP away (±DEEP in x and in z) lie inside its
// raised faces (no slack). A SUB point is "deep" in a source when all five do, i.e. it lies inside that source's
// footprint eroded by DEEP. Two sources overlap in a cell only where one same SUB point is deep in both: their
// footprints interpenetrate by more than DEEP there. Footprints that touch, or meet within DEEP, never share such a
// point; a real overlap of more than ~2 DEEP still counts in full.
const DEEP = 0.1;
const NB = [[0, 0], [DEEP, 0], [-DEEP, 0], [0, DEEP], [0, -DEEP]];
const ALL5 = (1 << NB.length) - 1;
const deepMask = (bits) => { let m = 0; for (let s = 0; s < SUB.length; s++) if (((bits >> (s * NB.length)) & ALL5) === ALL5) m |= 1 << s; return m; };
const raster = [];
for (const s of sources) {
  if (skip.has(s.name) || s.range[1] <= s.range[0]) continue;
  const cells = new Map(), kinds = new Map(), P = S.pos, K = S.knd;
  const fine = new Map(); // cell -> the highest upward face over the ground at each of its SUB x NB points (cells keeps the lowest, for road clearance under arches)
  for (let i = s.range[0]; i + 2 < s.range[1]; i += 3) {
    if (noCover.some(([f, t]) => i >= f && i < t)) continue;
    const k = i * 3;
    const ax = P[k], ay = P[k + 1], az = P[k + 2], bx = P[k + 3], by = P[k + 4], bz = P[k + 5], cx = P[k + 6], cy = P[k + 7], cz = P[k + 8];
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(ny) < 0.35 * Math.hypot(nx, ny, nz) || Math.abs(ny) < 0.02) continue; // walls; a face looking up or down
    if (ny < 0) continue;
    const up = Math.min(ay, by, cy) - groundY((ax + bx + cx) / 3, (az + bz + cz) / 3);
    if (up < ROAD_LO) continue;
    const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.floor(Math.max(ax, bx, cx)), z0 = Math.floor(Math.min(az, bz, cz)), z1 = Math.floor(Math.max(az, bz, cz));
    if ((x1 - x0) * (z1 - z0) > 4e6) continue;
    const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    const eps = -Math.min(0.02, 0.1 / Math.max(1, x1 - x0, z1 - z0)); // edge slack ~ 0.1 m, not 2 % of a 100 m yard face
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      let f = null;
      for (let si = 0; si < SUB.length; si++) for (let ni = 0; ni < NB.length; ni++) {
        const px = ix + SUB[si][0] + NB[ni][0], pz = iz + SUB[si][1] + NB[ni][1];
        const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
        if (!(l1 >= -1e-9 && l2 >= -1e-9 && 1 - l1 - l2 >= -1e-9)) continue;
        if (!f) { const c = key(ix, iz); f = fine.get(c); if (!f) fine.set(c, (f = new Float32Array(SUB.length * NB.length).fill(-Infinity))); }
        const b = si * NB.length + ni; if (up > f[b]) f[b] = up;
      }
      for (const [ox, oz] of SUB) {
        const px = ix + ox, pz = iz + oz;
        const l1 = ((bz - cz) * (px - cx) + (cx - bx) * (pz - cz)) / det, l2 = ((cz - az) * (px - cx) + (ax - cx) * (pz - cz)) / det;
        if (l1 > eps && l2 > eps && 1 - l1 - l2 > eps) {
          const c = key(ix, iz), was = cells.get(c);
          if (was === undefined || up < was) { cells.set(c, up); kinds.set(c, K[i]); } // the lowest raised face: what stands on the ground there
          break;
        }
      }
    }
  }
  const raised = new Map(), tallDeep = new Map();
  for (const [c, f] of fine) {
    let br = 0, bt = 0; f.forEach((u, b) => { if (u === -Infinity) return; if (u >= RAISED) br |= 1 << b; if (u >= 0.7) bt |= 1 << b; });
    const mr = deepMask(br), mt = deepMask(bt); if (mr) raised.set(c, mr); if (mt) tallDeep.set(c, mt);
  }
  if (cells.size) raster.push({ name: s.name, cells, kinds, raised, tallDeep }); // raised/tallDeep: cell -> SUB points deep in the source
}

// ---- carriageways: cells whose centre lies more than TOL inside a mapped street. Streets only (class 0-3, the ones
// city.js gives kerbs and pavements): service ways (4) are drives and lanes inside the very compounds the models pave,
// and footpaths (5) cross courts and stairs; bridges stand over what is under them ----
const carriage = new Map(); // cell -> the indices of the streets over it
(data.roads || []).forEach(([c0, bridge, f, w], wi) => {
  const c = Math.max(0, Math.min(ROAD_W.length - 1, c0 | 0));
  if (bridge || c > 3) return;
  const hw = (w > 0 ? w / 10 : ROAD_W[c]) / 2 - TOL;
  for (let i = 0; i + 3 < f.length; i += 2) {
    const ax = f[i] / 10, az = f[i + 1] / 10, bx = f[i + 2] / 10, bz = f[i + 3] / 10, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    for (let ix = Math.floor(Math.min(ax, bx) - hw); ix <= Math.floor(Math.max(ax, bx) + hw); ix++)
      for (let iz = Math.floor(Math.min(az, bz) - hw); iz <= Math.floor(Math.max(az, bz) + hw); iz++) {
        const px = ix + 0.5, pz = iz + 0.5, t = L2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)) : 0;
        if (Math.hypot(px - ax - t * dx, pz - az - t * dz) < hw) { const k = key(ix, iz), w = carriage.get(k); if (!w) carriage.set(k, [wi]); else if (w.at(-1) !== wi) w.push(wi); }
      }
  }
});

// ---- bridge heads. A bridge model's deck comes down onto the street it carries, so its ramp, kerbs and railings
// legitimately stand over the first metres of that street. The rule, per deck:
//   deck      a mapped bridge way of street class (0-3), or a hand-modelled bridge whose OSM ways the data build
//             drops (data.nguyenhoang's outline, data.truongtien's axis), with its half width;
//   owner     the source whose raised faces cover most of that deck's axis: only the model of that bridge is exempt;
//   approach  a street that starts at a deck end and leaves it in the deck's direction (within APPROACH_ANG): for a
//             mapped bridge way, one sharing its end node (within JOIN_WAY); for a dropped one, one starting within
//             the deck's width across and up to JOIN_OUTLINE past the outline (where the dropped ways ran). A street
//             carrying straight on from an approach street (same node, within APPROACH_ANG of the deck) is one too;
//   exempt    a carriageway cell of the owner that lies only on approach streets (a cell also on any other street,
//             a crossing road or the junction beyond, still counts) and inside the deck's corridor carried on past
//             its end: no wider than the deck, no further than REACH past where the approach streets begin.
// So a ramp that meets its street passes; one that spills sideways off the approach, onto a crossing road or a
// junction, or runs on too far, still fails.
const JOIN_WAY = 2, JOIN_OUTLINE = 45, APPROACH_ANG = 40, REACH = 40;
const COS_APP = Math.cos((APPROACH_ANG * Math.PI) / 180);
const decks = []; // { pts: [[x, z], ...], hw, join }
for (const [c0, bridge, f, w] of data.roads || []) {
  if (!bridge || (c0 | 0) > 3) continue;
  const pts = []; for (let i = 0; i + 1 < f.length; i += 2) pts.push([f[i] / 10, f[i + 1] / 10]);
  decks.push({ pts, hw: (w > 0 ? w / 10 : ROAD_W[c0 | 0]) / 2, join: JOIN_WAY });
}
if (data.nguyenhoang) {
  const nh = data.nguyenhoang, cx = nh.c[0] / 10, cz = nh.c[1] / 10, a = nh.a / 1000, h = nh.w / 20;
  decks.push({ pts: [[cx - Math.cos(a) * h, cz - Math.sin(a) * h], [cx + Math.cos(a) * h, cz + Math.sin(a) * h]], hw: nh.d / 20, join: JOIN_OUTLINE });
}
if (data.truongtien?.box) decks.push({ pts: [data.truongtien.a.map((q) => q / 10), data.truongtien.b.map((q) => q / 10)], hw: data.truongtien.box.d / 20, join: JOIN_OUTLINE });
const streets = []; // street index -> its two ends: [x, z, direction leaving that end] (class 0-3, not bridges)
(data.roads || []).forEach(([c0, bridge, f, w], wi) => {
  if (bridge || (c0 | 0) > 3 || f.length < 4) return;
  const end = (k, k2) => { const dx = f[k2] - f[k], dz = f[k2 + 1] - f[k + 1], dl = Math.hypot(dx, dz) || 1; return [f[k] / 10, f[k + 1] / 10, [dx / dl, dz / dl]]; };
  streets[wi] = [end(0, 2), end(f.length - 2, f.length - 4)];
});
const exempt = new Map(); // source name -> Set of cells
for (const dk of decks) {
  const { pts, hw, join } = dk;
  // the owner: the source raised over most of the axis, sampled every 2 m
  const samp = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
    for (let k = 0; k < n; k++) samp.push(key(Math.floor(ax + ((bx - ax) * k) / n), Math.floor(az + ((bz - az) * k) / n)));
  }
  const own = raster.find((r) => samp.filter((c) => r.cells.has(c)).length > samp.length / 2);
  if (!own) continue;
  for (const [E, Q] of [[pts[0], pts[1]], [pts.at(-1), pts.at(-2)]]) {
    const ol = Math.hypot(E[0] - Q[0], E[1] - Q[1]), o = [(E[0] - Q[0]) / ol, (E[1] - Q[1]) / ol]; // outward along the deck
    const rel = (x, z) => [(x - E[0]) * o[0] + (z - E[1]) * o[1], (x - E[0]) * -o[1] + (z - E[1]) * o[0]]; // along, across
    const approach = new Set(), far = []; // far: the other ends of the approach streets, to carry straight on from
    let joint = 0; // how far past the deck end the approach streets begin
    streets.forEach((ends, wi) => {
      ends.forEach(([x, z, d], j) => {
        const [al, ac] = rel(x, z), near = join === JOIN_WAY ? Math.hypot(x - E[0], z - E[1]) <= join : al >= -hw && al <= join && Math.abs(ac) <= hw + 1;
        if (!near || d[0] * o[0] + d[1] * o[1] < COS_APP || approach.has(wi)) return;
        approach.add(wi); joint = Math.max(joint, al); far.push(ends[1 - j]);
      });
    });
    while (far.length) { // streets carrying straight on, while still within reach
      const [fx, fz] = far.pop();
      if (rel(fx, fz)[0] > joint + REACH) continue;
      streets.forEach((ends, wi) => {
        if (approach.has(wi)) return;
        ends.forEach(([x, z, d], j) => {
          if (Math.hypot(x - fx, z - fz) > 1 || d[0] * o[0] + d[1] * o[1] < COS_APP || approach.has(wi)) return;
          approach.add(wi); far.push(ends[1 - j]);
        });
      });
    }
    if (!approach.size) continue;
    if (!exempt.has(own.name)) exempt.set(own.name, new Set());
    const ex = exempt.get(own.name);
    for (const c of own.cells.keys()) {
      const ws = carriage.get(c);
      if (!ws || !ws.every((w) => approach.has(w))) continue;
      const [al, ac] = rel(...unkey(c));
      if (al >= -hw && al <= joint + REACH && Math.abs(ac) <= hw + 1) ex.add(c);
    }
    if (process.env.DEBUG) console.log('DBG bridge head', own.name, E.map((q) => q.toFixed(0)).join(','), 'approach', [...approach].join('+'), 'joint', joint.toFixed(1), 'exempt so far', ex.size);
  }
}

// ---- tally ----
const placeName = (x, z) => { let best = '', bd = Infinity; for (const p of data.places || []) { const d = Math.hypot(p.x / 10 - x, p.z / 10 - z); if (d < bd) { bd = d; best = p.n; } } return best ? ` near ${best} (${bd.toFixed(0)} m)` : ''; };
const found = []; // { kind, name, area, at }
// cells grouped into 24 m blocks, biggest first, so one finding names each spot it covers
const clusters = (cells) => {
  const m = new Map();
  for (const c of cells) { const [x, z] = unkey(c), b = Math.floor(x / 24) + ',' + Math.floor(z / 24); if (!m.has(b)) m.set(b, { n: 0, x: 0, z: 0 }); const q = m.get(b); q.n++; q.x += x; q.z += z; }
  return [...m.values()].sort((p, q) => q.n - p.n).map((q) => ({ n: q.n, at: [q.x / q.n, q.z / q.n] }));
};
// area: m² (whole cells unless given; the overlap and building tests pass the area their deep SUB points sample)
const add = (kind, name, cells, area = cells.length) => { if (cells.length) { const cl = clusters(cells); found.push({ kind, name, area: Math.round(area * 10) / 10, at: cl[0].at, cl }); } };
const pop = (m) => { let n = 0; for (; m; m &= m - 1) n++; return n; };

// a Citadel gate carries its street through the rampart: inside the gate's mapped block (data.gates, the OSM outline)
// the carriageway narrows to the passage, so the block's piers and damp plinths there stand where the street's nominal
// width would be. Passage rule: a 'place:gate:<name>' cell is exempt inside that outline, 0.5 m wider along the wall
// and 4 m deeper on each face (blocks stand proud of the rampart); a step, apron or ramp beyond it still counts.
const inGatePassage = (() => {
  const boxes = new Map();
  for (const g of data.gates || []) {
    const a = g.a / 1000;
    boxes.set('place:gate:' + g.n, { x: g.c[0] / 10, z: g.c[1] / 10, ux: Math.cos(a), uz: Math.sin(a), hs: g.w / 20 + 0.5, ht: g.d / 20 + 4 });
  }
  return (name, c) => {
    const b = boxes.get(name); if (!b) return false;
    const [x, z] = unkey(c), dx = x - b.x, dz = z - b.z;
    return Math.abs(dx * b.ux + dz * b.uz) <= b.hs && Math.abs(-dx * b.uz + dz * b.ux) <= b.ht;
  };
})();

for (const r of raster) {
  const ex = exempt.get(r.name);
  const cells = [...r.cells].filter(([c, up]) => up <= ROAD_HI && carriage.has(c) && !ex?.has(c) && !inGatePassage(r.name, c)).map(([c]) => c);
  if (process.env.DEBUG && cells.length) { const h = {}; for (const c of cells) { const k = r.kinds.get(c) + ':' + (r.cells.get(c) < 0.6 ? 'lo' : r.cells.get(c) < 2 ? 'mid' : 'hi') + ' street ' + carriage.get(c).join('+'); h[k] = (h[k] || 0) + 1; } console.log('DBG', r.name, JSON.stringify(h)); }
  add('road', r.name, cells);
}

// a pair's area: the SUB points deep (see DEEP) in the raised faces of both, 1/5 m² each. A cell only half
// covered by the interpenetration counts half, so a 0.3 m sliver along a 50 m wall reads ~5 m², not 50.
const owner = new Map(); // cell -> [[index into raster, its deep SUB mask], ...] of the sources raised there
const pairs = new Map();
raster.forEach((r, i) => {
  for (const [c, m] of r.raised) {
    const os = owner.get(c);
    if (!os) { owner.set(c, [[i, m]]); continue; }
    for (const [j, mj] of os) {
      const both = m & mj;
      if (!both) continue;
      const k = raster[j].name + ' + ' + r.name;
      if (!pairs.has(k)) pairs.set(k, { cells: [], area: 0 });
      const q = pairs.get(k); q.cells.push(c); q.area += pop(both) / SUB.length;
    }
    os.push([i, m]);
  }
});
for (const [k, q] of pairs) add('overlap', k, q.cells, q.area);

// populate keeps a mapped building unless a model covers its middle and most of its outline (city.js populate)
const inRing = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const cover = world.cover;
// the same contact rule as for pairs: a building's area under a source is its SUB points deep (DEEP) both in the
// source's faces 0.7 m or more over the ground (populate's cover) and inside the building's outline, 1/5 m² each;
// so a plinth that only meets a kept hall's wall passes
const tall = new Map(); // cell -> [[source name, its deep SUB mask], ...] of the sources standing 0.7 m or more there
for (const r of raster) for (const [c, m] of r.tallDeep) { if (!tall.has(c)) tall.set(c, []); tall.get(c).push([r.name, m]); }
const tallHits = (ix, iz, inside) => { // [[source name, SUB points inside and deep in it], ...] in cell ix, iz
  const t = tall.get(key(ix, iz)); if (!t) return [];
  let m = 0; for (let s = 0; s < SUB.length; s++) if (NB.every(([dx, dz]) => inside(ix + SUB[s][0] + dx, iz + SUB[s][1] + dz))) m |= 1 << s;
  return t.map(([n, mt]) => [n, pop(m & mt)]).filter(([, k]) => k);
};
(data.bld || []).forEach((b) => {
  const ring = []; for (let i = 0; i + 1 < b[0].length; i += 2) ring.push([b[0][i] / 10, b[0][i + 1] / 10]);
  let cx = 0, cz = 0; for (const p of ring) { cx += p[0]; cz += p[1]; } cx /= ring.length; cz /= ring.length;
  if (cover.hit(cx, cz) && ring.filter((q) => cover.hit(cx + (q[0] - cx) * 0.8, cz + (q[1] - cz) * 0.8)).length >= ring.length * 0.7) return; // dropped
  if (b[2] === 2 && dainoiOwns(ring)) return;
  if (placeOwns(ring)) return;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const by = new Map();
  for (let ix = Math.floor(x0); ix <= Math.floor(x1); ix++) for (let iz = Math.floor(z0); iz <= Math.floor(z1); iz++) {
    for (const [n, k] of tallHits(ix, iz, (x, z) => inRing(x, z, ring))) {
      if (!by.has(n)) by.set(n, { cells: [], area: 0 }); const q = by.get(n); q.cells.push(key(ix, iz)); q.area += k / SUB.length;
    }
  }
  for (const [n, q] of by) add('building', `${n} under mapped building ${b[3] ? '"' + b[3] + '"' : '@' + cx.toFixed(0) + ',' + cz.toFixed(0)}`, q.cells, q.area);
});
for (const a of [data.infill || [], ...tiles.map((t) => t.infill)]) { // infill houses, hue.json's and the tiles': the ones populate keeps (its own houseOff test); here every square metre of each
  const N = 8, by = new Map();
  for (let i = 0; i + N <= a.length; i += N) {
    const x = a[i] / 10, z = a[i + 1] / 10, w = a[i + 2] / 10, d = a[i + 3] / 10, ang = a[i + 4] / 1000, ux = Math.cos(ang), uz = Math.sin(ang);
    if (world.houseOff(x, z, w, d, ang)) continue; // populate leaves it out
    const inBox = (px, pz) => { const dx = px - x, dz = pz - z; return Math.abs(dx * ux + dz * uz) < w / 2 && Math.abs(-dx * uz + dz * ux) < d / 2; };
    let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
    for (const [su, sv] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const px = x + (ux * su * w - uz * sv * d) / 2, pz = z + (uz * su * w + ux * sv * d) / 2; bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px); bz0 = Math.min(bz0, pz); bz1 = Math.max(bz1, pz); }
    for (let ix = Math.floor(bx0); ix <= Math.floor(bx1); ix++) for (let iz = Math.floor(bz0); iz <= Math.floor(bz1); iz++)
      for (const [n, k] of tallHits(ix, iz, inBox)) {
        if (!by.has(n)) by.set(n, new Map()); const m = by.get(n); if (!m.has(i)) m.set(i, { cells: [], area: 0 }); const q = m.get(i); q.cells.push(key(ix, iz)); q.area += k / SUB.length;
      }
  }
  for (const [n, m] of by) for (const [i, q] of m) add('building', `${n} under infill house @${(a[i] / 10).toFixed(0)},${(a[i + 1] / 10).toFixed(0)}`, q.cells, q.area);
}

// ---- report ----
let bad = 0;
found.sort((p, q) => q.area - p.area);
for (const f of found) {
  const fail = f.area > LIMIT[f.kind];
  if (fail) bad++;
  if (!fail && !showAll) continue;
  console.log(`${fail ? 'FAIL' : 'ok  '} ${f.kind.padEnd(8)} ${f.name}: ${f.area} m²${placeName(...f.at)}`);
  for (const c of f.cl.slice(0, showAll ? 12 : 4)) console.log(`       ${String(c.n).padStart(5)} cells at (${c.at[0].toFixed(1)}, ${c.at[1].toFixed(1)})`);
}
for (const e of errors) console.log('FAIL ' + e);
console.log(bad || errors.length ? `overlap: ${bad} overlap(s) over the limits` : `overlap: ok, ${raster.length} sources, no model on a carriageway, on another model or under a kept building over the limits (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(bad || errors.length ? 1 : 0);
