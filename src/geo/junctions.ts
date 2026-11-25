// Junctions: where carriageways meet, the junction box is plain asphalt.
//
// Each OSM way is drawn as its own ribbon, so two things went wrong where roads meet:
//  - lane markings were laid along every way from end to end, straight through the junction box and across the
//    carriageways of the roads it meets (and, where two divided roads cross, through the gap between the twins);
//  - the small patches that three or four meeting carriageways enclose (the middle of a divided-road crossing, the
//    sliver between a slip road and the roads it joins) were covered by no carriageway, only by the pale pavement
//    and kerb lines drawn under them, and showed as white squares and triangles out in the asphalt.
// junctionHoles() finds those patches; markingGuard() says where a road's markings may run.

export const HOLE_MAX = 150; // m²: an enclosed patch smaller than this is part of the junction, not an island
// m²: an enclosed patch a slip road (an unmarked road type, issue #67) runs along is a traffic island from this size
// up: the kerbed triangle between the slip road and the roads it joins. Below it, it is a gap where ribbons fail to meet.
export const ISLAND_MIN = 10;
export const MARK_PAD = 1.5; // m: markings stop this far short of another carriageway (room for a stop line)
export const CELL = 0.5; // m: the raster the holes are found on
const LINK = 30, REACH = 10; // m: junction nodes this close form one junction, looked at this far around
export const PAR_DEG = 30; // a way within this of parallel to a marking runs alongside it, it doesn't cross it
const PAR_SIN = Math.sin((PAR_DEG * Math.PI) / 180);
const CONT_COS = Math.cos((40 * Math.PI) / 180); // a way meeting another end to end within 40° continues it
const ck = (i, j) => i * 1048576 + j; // a cell's key (|j| < 2^19 cells: ±260 km)
const pkey = (p) => Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2);

// cw: [{ id, c, pts, L, R, u }] (pts the centre line, L, R its ribbon's two edges, as ribbonPoints gives them; u: an
// unmarked slip road, whose islands are kept, see ISLAND_MIN).
// skip(x, z): leave a patch whose middle is here alone (a mapped green island).
// Returns { holes: [{ cells: [[i, j]...], c, x, z, area }], cells: Set of cell keys }: the patches the carriageways
// enclose and none covers, smaller than HOLE_MAX, found on a CELL raster around each junction (flood-filled from the
// window's edge: what the flood cannot reach is enclosed). c is the class of the most important carriageway around
// the patch, to paint it in that road's asphalt.
export function junctionHoles(cw, skip = null) {
  // the triangles of every carriageway, indexed on a coarse grid
  const G = 32, grid = new Map();
  for (const r of cw) {
    const { L, R } = r;
    for (let i = 0; i + 1 < L.length; i++) for (const t of [[L[i], R[i], R[i + 1]], [L[i], R[i + 1], L[i + 1]]]) {
      const x0 = Math.min(t[0][0], t[1][0], t[2][0]), x1 = Math.max(t[0][0], t[1][0], t[2][0]);
      const z0 = Math.min(t[0][1], t[1][1], t[2][1]), z1 = Math.max(t[0][1], t[1][1], t[2][1]);
      const T = { t, c: r.c, u: !!r.u, x0, x1, z0, z1, stamp: -1 };
      for (let x = Math.floor(x0 / G); x <= Math.floor(x1 / G); x++) for (let z = Math.floor(z0 / G); z <= Math.floor(z1 / G); z++) {
        const k = ck(x, z), list = grid.get(k);
        if (list) list.push(T); else grid.set(k, [T]);
      }
    }
  }
  // junction nodes: a point three carriageway ends meet at, or one end meets another way's middle
  const deg = new Map(), at = new Map();
  for (const r of cw) r.pts.forEach((p, i) => {
    const k = pkey(p);
    deg.set(k, (deg.get(k) || 0) + (i === 0 || i === r.pts.length - 1 ? 1 : 2));
    at.set(k, p);
  });
  const nodes = [...deg].filter(([, d]) => d >= 3).map(([k]) => at.get(k));
  // clusters of nodes (a divided-road crossing is four nodes or more), by a union-find over a LINK grid
  const par = nodes.map((_, i) => i), find = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  const ng = new Map();
  nodes.forEach((p, i) => { const k = Math.floor(p[0] / LINK) + ',' + Math.floor(p[1] / LINK); if (!ng.has(k)) ng.set(k, []); ng.get(k).push(i); });
  nodes.forEach((p, i) => {
    const gx = Math.floor(p[0] / LINK), gz = Math.floor(p[1] / LINK);
    for (let x = gx - 1; x <= gx + 1; x++) for (let z = gz - 1; z <= gz + 1; z++) for (const j of ng.get(x + ',' + z) || [])
      if (j < i && Math.hypot(nodes[j][0] - p[0], nodes[j][1] - p[1]) < LINK) par[find(j)] = find(i);
  });
  const clusters = new Map();
  nodes.forEach((p, i) => { const r = find(i); if (!clusters.has(r)) clusters.set(r, []); clusters.get(r).push(p); });

  const holes = [], cells = new Set();
  const maxCells = HOLE_MAX / (CELL * CELL);
  let m = new Uint8Array(0), cls = m, un = m, q = new Int32Array(0), stamp = 0;
  for (const ps of clusters.values()) {
    if (ps.length < 2) continue; // a hole is ringed by a loop of carriageways: two junctions at least (a slip road and the road it leaves)
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of ps) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const i0 = Math.floor((x0 - REACH) / CELL), j0 = Math.floor((z0 - REACH) / CELL);
    const W = Math.ceil((x1 + REACH) / CELL) - i0 + 1, H = Math.ceil((z1 + REACH) / CELL) - j0 + 1;
    if (W * H > 4e6) continue;
    if (m.length < W * H) { m = new Uint8Array(W * H * 2); cls = new Uint8Array(W * H * 2); un = new Uint8Array(W * H * 2); q = new Int32Array(W * H * 2); }
    m.fill(0, 0, W * H); // 0 open, 1 carriageway, 2 reached from outside, 3 enclosed
    cls.fill(9, 0, W * H);
    un.fill(0, 0, W * H); // 1: a slip road covers the cell
    stamp++;
    for (let x = Math.floor((i0 * CELL) / G); x <= Math.floor(((i0 + W) * CELL) / G); x++)
      for (let z = Math.floor((j0 * CELL) / G); z <= Math.floor(((j0 + H) * CELL) / G); z++)
        for (const T of grid.get(ck(x, z)) || []) {
          if (T.stamp === stamp) continue;
          T.stamp = stamp;
          fillTri(T, m, cls, un, i0, j0, W, H);
        }
    // flood the open cells from the window's edge
    let qh = 0, qt = 0;
    const push = (k) => { if (m[k] === 0) { m[k] = 2; q[qt++] = k; } };
    for (let i = 0; i < W; i++) { push(i); push((H - 1) * W + i); }
    for (let j = 0; j < H; j++) { push(j * W); push(j * W + W - 1); }
    while (qh < qt) {
      const k = q[qh++], i = k % W;
      if (i > 0) push(k - 1);
      if (i < W - 1) push(k + 1);
      if (k >= W) push(k - W);
      if (k < (H - 1) * W) push(k + W);
    }
    // what is still open is enclosed: one hole per connected patch
    for (let k0 = 0; k0 < W * H; k0++) {
      if (m[k0] !== 0) continue;
      const patch = [];
      let c = 9, slip = false;
      m[k0] = 3; q[0] = k0; qh = 0; qt = 1;
      const visit = (n) => { if (m[n] === 0) { m[n] = 3; q[qt++] = n; } else if (m[n] === 1) { if (cls[n] < c) c = cls[n]; if (un[n]) slip = true; } };
      while (qh < qt) {
        const k = q[qh++], i = k % W;
        patch.push(k);
        if (i > 0) visit(k - 1);
        if (i < W - 1) visit(k + 1);
        if (k >= W) visit(k - W);
        if (k < (H - 1) * W) visit(k + W);
      }
      if (patch.length > maxCells || (slip && patch.length * CELL * CELL >= ISLAND_MIN)) continue; // too big, or a slip road's island
      let sx = 0, sz = 0;
      const out = patch.map((k) => { const i = i0 + (k % W), j = j0 + ((k / W) | 0); sx += i; sz += j; return [i, j]; });
      if (cells.has(ck(out[0][0], out[0][1]))) continue; // found from a neighbouring junction's window already
      const x = (sx / out.length + 0.5) * CELL, z = (sz / out.length + 0.5) * CELL;
      if (skip && skip(x, z)) continue;
      for (const [i, j] of out) cells.add(ck(i, j));
      holes.push({ cells: out, c, x, z, area: out.length * CELL * CELL });
    }
  }
  return { holes, cells };
}

// mark the cells whose centres a triangle covers (1), with the most important class covering each
function fillTri(T, m, cls, un, i0, j0, W, H) {
  const [a, b, c] = T.t;
  const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(area) < 1e-6) return;
  const s = area > 0 ? 1 : -1;
  const ia = Math.max(0, Math.floor(T.x0 / CELL) - i0), ib = Math.min(W - 1, Math.ceil(T.x1 / CELL) - i0);
  const ja = Math.max(0, Math.floor(T.z0 / CELL) - j0), jb = Math.min(H - 1, Math.ceil(T.z1 / CELL) - j0);
  for (let j = ja; j <= jb; j++) {
    const z = (j0 + j + 0.5) * CELL;
    for (let i = ia; i <= ib; i++) {
      const x = (i0 + i + 0.5) * CELL;
      if (((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0])) * s < 0) continue;
      if (((c[0] - b[0]) * (z - b[1]) - (c[1] - b[1]) * (x - b[0])) * s < 0) continue;
      if (((a[0] - c[0]) * (z - c[1]) - (a[1] - c[1]) * (x - c[0])) * s < 0) continue;
      const k = j * W + i;
      m[k] = 1;
      if (T.u) un[k] = 1;
      if (T.c < cls[k]) cls[k] = T.c;
    }
  }
}

// Is (x, z) within pad of a hole cell?
export function nearHole(cells, x, z, pad = 0) {
  const r = Math.ceil(pad / CELL), i = Math.floor(x / CELL), j = Math.floor(z / CELL);
  for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) if (cells.has(ck(i + di, j + dj))) return true;
  return false;
}

// The cells of a hole, grown by one cell (under the carriageways around it, which are drawn over it) and merged
// into runs along each row: [x0, x1, z0, z1] rectangles to paint.
export function holeRects(hole) {
  const rows = new Map();
  for (const [i, j] of hole.cells) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const r = j + dj;
    if (!rows.has(r)) rows.set(r, new Set());
    rows.get(r).add(i + di);
  }
  const out = [];
  for (const [j, set] of rows) {
    const xs = [...set].sort((a, b) => a - b);
    for (let k = 0; k < xs.length;) {
      let e = k;
      while (e + 1 < xs.length && xs[e + 1] === xs[e] + 1) e++;
      out.push([xs[k] * CELL, (xs[e] + 1) * CELL, j * CELL, (j + 1) * CELL]);
      k = e + 1;
    }
  }
  return out;
}

export function inPoly(ring, x, z) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// Ways that carry on one from the other: they share an end point and run on within CONT_COS there. Two pieces of
// one street (OSM splits a street wherever a tag changes) are one carriageway, and neither stops the other's lines.
export function continues(a, b) {
  for (const [pa, qa] of [[a[0], a[1]], [a.at(-1), a.at(-2)]])
    for (const [pb, qb] of [[b[0], b[1]], [b.at(-1), b.at(-2)]]) {
      if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > 0.3) continue;
      // a runs out through pa, b runs on from pb
      const ux = pa[0] - qa[0], uz = pa[1] - qa[1], vx = qb[0] - pb[0], vz = qb[1] - pb[1];
      const l = Math.hypot(ux, uz) * Math.hypot(vx, vz);
      if (l > 0 && (ux * vx + uz * vz) / l > CONT_COS) return true;
    }
  return false;
}

// roads: [{ id, c, w, pts }] the carriageways that stop markings (centre lines, as drawn); holeCells:
// junctionHoles().cells. Returns guard(id, x, z, ang): may road id's markings, running at heading ang (radians, in
// the x-z plane), cover (x, z)? Not on another road's carriageway, not within MARK_PAD of one, and not within MARK_PAD
// of a junction hole: the junction box is left plain. A way's own continuations don't count, and neither does a way
// running alongside (within PAR_DEG of parallel: a twin carriageway, a slip road, the two arms of a fork), whose
// ribbon can overlap this one for tens of metres without any junction there.
export function markingGuard(roads, holeCells = null) {
  const G = 24, grid = new Map();
  const ends = new Map(); // end point → roads ending there, to find each road's continuations
  for (const r of roads) {
    for (const p of [r.pts[0], r.pts.at(-1)]) { const k = pkey(p); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(r); }
    for (let i = 0; i + 1 < r.pts.length; i++) {
      // a tapering road (r.ws, one width per point) guards each piece at its own width, not its widest: a slip road
      // widening into a main road at one end is narrow everywhere else
      const hw = (r.ws ? Math.max(r.ws[i], r.ws[i + 1]) : r.w) / 2 + MARK_PAD;
      const a = r.pts[i], b = r.pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const it = { r, a, b, hw, ux: (b[0] - a[0]) / l, uz: (b[1] - a[1]) / l };
      for (let x = Math.floor((Math.min(a[0], b[0]) - hw) / G); x <= Math.floor((Math.max(a[0], b[0]) + hw) / G); x++)
        for (let z = Math.floor((Math.min(a[1], b[1]) - hw) / G); z <= Math.floor((Math.max(a[1], b[1]) + hw) / G); z++) {
          const k = x + ',' + z;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(it);
        }
    }
  }
  const cont = new Map(); // id → ids it continues into
  const contOf = (r) => {
    if (!cont.has(r.id)) {
      const s = new Set();
      for (const p of [r.pts[0], r.pts.at(-1)]) for (const o of ends.get(pkey(p)) || []) if (o !== r && continues(r.pts, o.pts)) s.add(o.id);
      cont.set(r.id, s);
    }
    return cont.get(r.id);
  };
  const byId = new Map(roads.map((r) => [r.id, r]));
  const none = new Set();
  return (id, x, z, ang = null) => {
    const ux = ang === null ? 0 : Math.cos(ang), uz = ang === null ? 0 : Math.sin(ang);
    if (holeCells && nearHole(holeCells, x, z, MARK_PAD)) return false;
    const self = byId.get(id), own = self ? contOf(self) : none;
    for (const it of grid.get(Math.floor(x / G) + ',' + Math.floor(z / G)) || []) {
      if (it.r.id === id || own.has(it.r.id)) continue;
      if (ang !== null && Math.abs(ux * it.uz - uz * it.ux) < PAR_SIN) continue;
      const { a, b, hw } = it;
      const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
      const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
      if (Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) < hw) return false;
    }
    return true;
  };
}

// Slivers: two carriageways running side by side with less than SLIVER between their kerbs (a street mapped beside a
// main road, the arms of a fork near its nose) left a strip of pale pavement too narrow to walk on, ending square out
// in the junction where the roads part. It is paved: the asphalt runs across from kerb to kerb, the two roads read as
// one wider road there, and the pavement starts where the gap opens past SLIVER.
// roads: [{ c, w, pts }] (carriageways only). Returns [{ pts, ws, c }]: strips along the gaps with a width per point
// (each kerb line 0.3 m inside), c the more important road's class.
export const SLIVER = 2.5; // m
export function slivers(roads) {
  const G = 24, grid = new Map(), segs = [];
  roads.forEach((r, id) => {
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-6) continue;
      const s = { id, a, b, L, tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L };
      segs.push(s);
      const r0 = r.w / 2 + 10;
      for (let x = Math.floor((Math.min(a[0], b[0]) - r0) / G); x <= Math.floor((Math.max(a[0], b[0]) + r0) / G); x++)
        for (let z = Math.floor((Math.min(a[1], b[1]) - r0) / G); z <= Math.floor((Math.max(a[1], b[1]) + r0) / G); z++) {
          const k = x + ',' + z;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(s);
        }
    }
  });
  const out = [];
  roads.forEach((A, ai) => {
    const runs = [[], []]; // per side: the samples of the current strip
    const flush = (k) => {
      const run = runs[k];
      if (run.length >= 2) out.push({ pts: run.map((s) => s.p), ws: run.map((s) => s.w), c: Math.min(A.c, roads[run[0].b].c) });
      runs[k] = [];
    };
    for (let i = 0; i + 1 < A.pts.length; i++) {
      const a = A.pts[i], b = A.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-6) continue;
      const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
      for (let s = i ? 1 : 0; s <= Math.floor(L); s++) {
        const px = a[0] + tx * s, pz = a[1] + tz * s;
        const best = [null, null];
        for (const g of grid.get(Math.floor(px / G) + ',' + Math.floor(pz / G)) || []) {
          if (g.id === ai || Math.abs(tx * g.tz - tz * g.tx) > PAR_SIN) continue;
          const t = Math.max(0, Math.min(g.L, (px - g.a[0]) * g.tx + (pz - g.a[1]) * g.tz));
          const qx = g.a[0] + g.tx * t, qz = g.a[1] + g.tz * t, d = Math.hypot(qx - px, qz - pz);
          const gap = d - A.w / 2 - roads[g.id].w / 2;
          if (d < 1e-6 || gap < -0.3 || gap >= SLIVER) continue;
          // the nearest point has to lie square off this road, not off the end of B's segment at an angle
          if (Math.abs(((qx - px) * tx + (qz - pz) * tz) / d) > 0.35) continue;
          const k = tx * (qz - pz) - tz * (qx - px) > 0 ? 1 : 0;
          if (!best[k] || gap < best[k].gap) best[k] = { b: g.id, gap, nx: (qx - px) / d, nz: (qz - pz) / d };
        }
        for (const k of [0, 1]) {
          const h = best[k];
          // each strip once, from the road with the lower index
          if (!h || h.b < ai || (runs[k].length && runs[k][0].b !== h.b)) { flush(k); if (!h || h.b < ai) continue; }
          const o = A.w / 2 + h.gap / 2;
          runs[k].push({ b: h.b, p: [px + h.nx * o, pz + h.nz * o], w: Math.max(0.3, h.gap + 0.6) });
        }
      }
    }
    flush(0); flush(1);
  });
  return out;
}

// Asphalt: the carriageway ribbons as drawn (ribbons: [{ L, R }], the edge points of each), the junction holes painted
// between them and the paved slivers. Returns on(x, z): is that point on it? Trees keep off it (geo/city.js populate).
export function asphaltTest(ribbons, holeCells) {
  const G = 8, grid = new Map();
  for (const { L, R } of ribbons) for (let i = 0; i + 1 < L.length; i++) for (const t of [[L[i], R[i], R[i + 1]], [L[i], R[i + 1], L[i + 1]]]) {
    const xs = [t[0][0], t[1][0], t[2][0]], zs = [t[0][1], t[1][1], t[2][1]];
    for (let x = Math.floor(Math.min(...xs) / G); x <= Math.floor(Math.max(...xs) / G); x++)
      for (let z = Math.floor(Math.min(...zs) / G); z <= Math.floor(Math.max(...zs) / G); z++) {
        const k = ck(x, z), c = grid.get(k);
        if (c) c.push(t); else grid.set(k, [t]);
      }
  }
  const inTri = ([a, b, c], x, z) => {
    const d1 = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
    const d2 = (c[0] - b[0]) * (z - b[1]) - (c[1] - b[1]) * (x - b[0]);
    const d3 = (a[0] - c[0]) * (z - c[1]) - (a[1] - c[1]) * (x - c[0]);
    return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
  };
  return (x, z) => holeCells.has(ck(Math.floor(x / CELL), Math.floor(z / CELL))) || (grid.get(ck(Math.floor(x / G), Math.floor(z / G))) || []).some((t) => inTri(t, x, z));
}
