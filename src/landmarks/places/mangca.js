import { KIND, hex, shade, mix, inRing, rand } from '../../geo/buf.js';
import { LAND_Y, WALL_H, PAL } from '../../config.js';
import { streetTest } from '../enclosure.js';

// Trấn Bình Đài (đồn Mang Cá), the outwork at the Citadel's north-east corner, and Trấn Bình Môn, the gate in the
// Citadel's own wall that leads out to it over the common moat.
//
// Sourced (see docs/places/mangca.md): an earth ring from 1805 (đài Thái Bình), rebuilt in brick in 1836 under Minh
// Mạng and renamed Trấn Bình Đài; Vauban-style, the Citadel's 25th bastion, cut off from the main wall by a shared
// moat. Perimeter 1,048 m; wall 5.10 m high and nearly 15 m thick; a 7.5 m path along the outer foot; moat 32 m wide.
// Six flights of steps, each 3.35 m wide, up the inner face. Its own gate, Trường Định môn, sits in the middle of the
// south flank: a plain passage through the wall 2 m wide under a 3 m arch, with no tower, and stands as a ruin today.
// Trấn Bình Môn is a plain passage through the Citadel wall, likewise without a watch tower; on top of it stands an
// old, abandoned building roofed with cement tiles, its wooden doors rotting and the masonry overgrown. A PAVN
// barracks since 1975, closed to the public.
//
// Plan: the wall band as OSM maps it (relation 8541343's two smaller pieces, hard-coded below in model metres). The
// mapped band runs round the north, east and south; the gorge facing the Citadel across the shared moat carries no
// mapped wall, and the mapped band alone (about 1,000 m on its outer line) already makes up the sourced 1,048 m, so
// none is drawn there. The gap in the south flank is Trường Định môn. Trấn Bình Môn is OSM way 367959083 (footprint
// below), against the inner face of the Citadel wall, on the axis of cầu Mang Cá (way 367959081).
export const id = 'mangca';

// the fort's wall band (from data.wall[1] and data.wall[2]; metres, x east, z south)
const BAND_NE = [[-1444.1, -2341.8], [-1291.1, -2533.8], [-1255.3, -2457.3], [-1094.5, -2452.4], [-1092.0, -2451.9], [-1089.9, -2450.6], [-1088.3, -2448.6], [-1087.5, -2446.3], [-1087.6, -2443.8], [-1128.1, -2288.1], [-1064.2, -2239.1], [-1061.4, -2236.0], [-1059.9, -2232.0], [-1059.8, -2227.9], [-1061.2, -2223.9], [-1064.0, -2220.7], [-1067.6, -2218.7], [-1174.7, -2182.2], [-1180.1, -2197.7], [-1081.2, -2231.4], [-1146.8, -2281.7], [-1106.6, -2436.3], [-1248.4, -2440.7], [-1253.6, -2441.3], [-1258.6, -2442.9], [-1263.3, -2445.3], [-1267.4, -2448.6], [-1270.8, -2452.5], [-1273.4, -2457.1], [-1294.8, -2502.8], [-1431.1, -2331.7]];
const BAND_SW = [[-1299.9, -2156.9], [-1190.8, -2194.1], [-1185.5, -2178.6], [-1294.5, -2141.4]];
const FORT_IN = [-1250, -2330]; // a point inside the fort, to tell the outer faces from the inner

const FORT_H = 5.10; // wall walk above the ground
const PARAPET_H = 1.0, PARAPET_T = 1.2; // estimates, a little lower than the Citadel's
const EMBRASURES = 21; // the 21 gun emplacements
const EMB_W = 0.9, SILL = 0.4;
const STAIR_W = 3.35, STAIRS = 6;

// Trấn Bình Môn: OSM footprint, and the gate's axis (cầu Mang Cá starts at its outer mouth)
const GATE_RING = [[-1453.2, -2161.6], [-1442.4, -2169.5], [-1451.7, -2182.2], [-1463.1, -2197.9], [-1474.1, -2190.3], [-1462.5, -2174.4]];
const GATE_C = [-1458.2, -2179.9];
const GT = [0.589, 0.808], GN = [0.808, -0.589]; // along the wall; out of the Citadel (north-east)
const GATE_HALF_D = 6.7, WALL_OUTER = 10.3, AXIS = 2.0; // inner face, the Citadel wall's outer face, axis offset (m)

export function build({ S, data }) {
  const brick = shade(PAL.brick, 0.86), damp = hex('#3a3833'), dark = hex('#46443e'), relaid = hex('#655e57'), lichen = hex('#4a4d3e');
  const walk = PAL.moss, ivy = hex('#34482a'), ivy2 = hex('#4a5e34');
  const y0 = LAND_Y - 0.5, yW = LAND_Y + FORT_H;
  const bands = [BAND_NE, BAND_SW];
  const inBand = (x, z) => bands.some((r) => inRing(x, z, r));
  const crossings = (ax, az, bx, bz) => {
    let c = 0;
    for (const r of bands) for (let i = 0; i < r.length; i++) {
      const p = r[i], q = r[(i + 1) % r.length];
      const d1 = (bx - ax) * (p[1] - az) - (bz - az) * (p[0] - ax), d2 = (bx - ax) * (q[1] - az) - (bz - az) * (q[0] - ax);
      if ((d1 > 0) === (d2 > 0)) continue;
      const d3 = (q[0] - p[0]) * (az - p[1]) - (q[1] - p[1]) * (ax - p[0]), d4 = (q[0] - p[0]) * (bz - p[1]) - (q[1] - p[1]) * (bx - p[0]);
      if ((d3 > 0) !== (d4 > 0)) c++;
    }
    return c;
  };

  // ---- the fort's walls ----
  const n0 = S.n;
  S.kind = KIND.MASONRY;
  const edges = [];
  for (const r of bands) {
    S.prism(r, y0, yW, brick, walk, { topKind: KIND.GROUND });
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.4) continue;
      const ux = dx / len, uz = dz / len, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      let nx = uz, nz = -ux;
      if (inBand(mx + nx * 0.6, mz + nz * 0.6)) { nx = -nx; nz = -nz; }
      const outer = len > 17 || len < 6 ? crossings(mx + nx * 2, mz + nz * 2, FORT_IN[0], FORT_IN[1]) > 0 : null; // the band's ends (15-17 m) are neither
      edges.push({ a, b, len, ux, uz, nx, nz, outer, ang: Math.atan2(dz, dx) });
    }
  }
  for (const e of edges) if (e.len >= 1.5) weather(S, e, y0, yW, { damp, dark, relaid, lichen }, Math.round(e.a[0] * 7 + e.a[1] * 13));

  // parapet on the outer edges, with the 21 embrasures shared out over the long faces by length
  const outerLong = edges.filter((e) => e.outer && e.len > 25);
  const total = outerLong.reduce((s, e) => s + e.len, 0);
  const share = outerLong.map((e) => (EMBRASURES * e.len) / total);
  const count = share.map(Math.floor);
  for (let left = EMBRASURES - count.reduce((s, c) => s + c, 0); left > 0; left--) {
    let k = 0; for (let j = 1; j < share.length; j++) if (share[j] - count[j] > share[k] - count[k]) k = j;
    count[k]++; share[k] = count[k];
  }
  const pcol = shade(brick, 0.92), cap = shade(brick, 1.12);
  for (const e of edges) {
    if (!e.outer) continue;
    const cx0 = e.a[0] - e.nx * (PARAPET_T / 2), cz0 = e.a[1] - e.nz * (PARAPET_T / 2);
    const run = (s0, s1, h1) => { if (s1 - s0 > 0.05) { const sm = (s0 + s1) / 2; S.box(cx0 + e.ux * sm, cz0 + e.uz * sm, yW - 0.05, h1, s1 - s0, PARAPET_T, e.ang, pcol, { top: cap }); } };
    const k = count[outerLong.indexOf(e)] || 0, ext = e.len < 3 ? 0.3 : 0.7;
    if (!k) { run(-ext, e.len + ext, yW + PARAPET_H); continue; }
    const step = e.len / (k + 1);
    let s = -ext;
    for (let j = 1; j <= k; j++) {
      const c = j * step;
      run(s, c - EMB_W / 2, yW + PARAPET_H);
      run(c - EMB_W / 2, c + EMB_W / 2, yW + SILL);
      s = c + EMB_W / 2;
    }
    run(s, e.len + ext, yW + PARAPET_H);
  }
  S.kind = KIND.PLAIN;
  (S.noCover = S.noCover || []).push([n0, S.n]); // the walk is planted ground, as on the Citadel's rampart

  // six flights of steps up the inner face (positions estimated: the middle of the six longest inner faces)
  S.kind = KIND.MASONRY;
  const stepCol = shade(PAL.brickLight, 0.9), tread = 0.36, rise = 0.3;
  const nSteps = Math.ceil(FORT_H / rise);
  for (const e of edges.filter((q) => q.outer === false && q.len > 40).sort((p, q) => q.len - p.len).slice(0, STAIRS)) {
    const run = nSteps * tread, s0 = e.len / 2 - run / 2;
    const ox = e.a[0] + e.nx * (STAIR_W / 2 + 0.02), oz = e.a[1] + e.nz * (STAIR_W / 2 + 0.02);
    for (let j = 0; j < nSteps; j++) {
      const s = s0 + (j + 0.5) * tread, top = Math.min(yW, LAND_Y + (j + 1) * rise);
      S.box(ox + e.ux * s, oz + e.uz * s, LAND_Y - 0.2, top, tread + 0.02, STAIR_W, e.ang, j % 2 ? stepCol : shade(stepCol, 0.94), { top: shade(stepCol, 1.08) });
    }
    // a low side wall on the open side of the flight
    const sx = ox + e.nx * (STAIR_W / 2 + 0.2), sz = oz + e.nz * (STAIR_W / 2 + 0.2), sm = s0 + run / 2;
    S.box(sx + e.ux * sm, sz + e.uz * sm, LAND_Y - 0.2, LAND_Y + 0.5, run, 0.4, e.ang, dark, { top: shade(dark, 1.2), taper: 1 });
  }

  // ---- Trường Định môn: the ruined gate in the south flank ----
  // OSM maps an 11 m breach between the two pieces, and a lane runs through it: the 2 m passage and its 3 m arch are
  // gone. What is drawn: the broken wall ends, stepping down into the breach, the stump of each jamb, and fallen brick.
  // The lane OSM maps through it crosses a metre off the breach's middle, towards the south-west end, so
  // each piece is laid only where its footprint stays off the carriageway: the rubble lies either side of the lane.
  {
    const A = [(BAND_SW[1][0] + BAND_SW[2][0]) / 2, (BAND_SW[1][1] + BAND_SW[2][1]) / 2]; // end of the south-west piece
    const B = [(BAND_NE[17][0] + BAND_NE[18][0]) / 2, (BAND_NE[17][1] + BAND_NE[18][1]) / 2]; // end of the north-east piece
    const gx = B[0] - A[0], gz = B[1] - A[1], gl = Math.hypot(gx, gz), ux = gx / gl, uz = gz / gl, ang = Math.atan2(gz, gx);
    const depth = Math.hypot(BAND_SW[2][0] - BAND_SW[1][0], BAND_SW[2][1] - BAND_SW[1][1]);
    const nx = -uz, nz = ux; // across the wall
    const ruin = shade(brick, 1.05);
    const street = streetTest(data, A, 40);
    // a box (centre x, z; length l along the wall, width w across it; turned by ang) clear of the lane, 0.3 m to spare
    const clear = (x, z, l, w, a = ang) => {
      const ca = Math.cos(a), sa = Math.sin(a);
      for (const [p, q] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [0, 0]]) if (street(x + ca * p * l - sa * q * w, z + sa * p * l + ca * q * w, 0.3)) return false;
      return true;
    };
    S.kind = KIND.MASONRY;
    for (const [end, dir] of [[A, 1], [B, -1]]) {
      // the broken end: three steps of masonry reaching into the breach, each lower, in slices across the wall
      for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) {
        const reach = 0.7 + j * 0.7, v = -depth / 2 + (k + 0.5) * (depth / 3);
        const h = LAND_Y + FORT_H * (0.78 - j * 0.22) - rand(j * 5 + k + dir * 11, 31) * 0.9;
        const u = dir * (reach - 0.35);
        if (!clear(end[0] + ux * u + nx * v, end[1] + uz * u + nz * v, 0.72, depth / 3 + 0.04)) continue;
        S.box(end[0] + ux * u + nx * v, end[1] + uz * u + nz * v, y0, h, 0.72, depth / 3 + 0.04, ang, j ? shade(ruin, 0.95 - j * 0.04) : ruin, { top: walk });
      }
      // the jamb's stump, lime-faced, where the passage once ran
      const u = dir * 2.4;
      if (clear(end[0] + ux * u, end[1] + uz * u, 0.8, 2.2)) S.box(end[0] + ux * u, end[1] + uz * u, y0, LAND_Y + 1.1 + rand(dir + 3, 32) * 0.6, 0.8, 2.2, ang, hex('#8d877a'), { top: shade(walk, 0.9) });
    }
    S.kind = KIND.PLAIN;
    const c = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    for (let k = 0; k < 9; k++) { // fallen brick along the foot of the breach, clear of the lane
      const side = k % 2 ? 1 : -1, u = side * (3.2 + rand(k, 13) * 1.6), v = (rand(k, 14) - 0.5) * (depth + 2);
      const bl = 0.6 + rand(k, 16) * 0.8, bw = 0.5 + rand(k, 17) * 0.6;
      if (!clear(c[0] + ux * u + nx * v, c[1] + uz * u + nz * v, Math.hypot(bl, bw), Math.hypot(bl, bw))) continue;
      S.box(c[0] + ux * u + nx * v, c[1] + uz * u + nz * v, LAND_Y - 0.1, LAND_Y + 0.2 + rand(k, 15) * 0.4, 0.6 + rand(k, 16) * 0.8, 0.5 + rand(k, 17) * 0.6, ang + rand(k, 18), dark);
    }
  }

  // ---- Trấn Bình Môn ----
  {
    const gTop = LAND_Y + WALL_H;
    S.prism(GATE_RING, LAND_Y - 0.4, gTop, brick, walk, { topKind: KIND.GROUND });
    for (let i = 0; i < GATE_RING.length; i++) {
      const a = GATE_RING[i], b = GATE_RING[(i + 1) % GATE_RING.length];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      let nx = dz / len, nz = -dx / len;
      if (inRing(a[0] + dx / 2 + nx * 0.5, a[1] + dz / 2 + nz * 0.5, GATE_RING)) { nx = -nx; nz = -nz; }
      if (len > 1.5) weather(S, { a, len, ux: dx / len, uz: dz / len, nx, nz }, LAND_Y - 0.4, gTop, { damp, dark, relaid, lichen }, 31 + i);
    }
    const ax = GATE_C[0] + GT[0] * AXIS, az = GATE_C[1] + GT[1] * AXIS;
    // the passage's two mouths: on the gate block's city face, and on the Citadel wall's outer face over the bridge
    archway(S, ax - GN[0] * (GATE_HALF_D + 0.03), az - GN[1] * (GATE_HALF_D + 0.03), [-GN[0], -GN[1]], GT);
    archway(S, ax + GN[0] * (WALL_OUTER + 0.03), az + GN[1] * (WALL_OUTER + 0.03), GN, GT);

    // the old building on top (size estimated), abandoned: stained lime wash, cement-tiled hip roof
    const bw = 15, bd = 7.2, bh = 3.1, ang = Math.atan2(GT[1], GT[0]);
    const wash = hex('#a89a78'), roof = hex('#6f6c66');
    S.kind = KIND.COLONIAL;
    S.box(ax, az, gTop, gTop + bh, bw, bd, ang, wash, { top: shade(wash, 0.8) });
    S.kind = KIND.PLAIN;
    for (const sd of [-1, 1]) for (let j = 0; j < 5; j++) { // empty window and door openings
      const s = -bw / 2 + 1.5 + j * ((bw - 3) / 4), door = j === 2;
      const px = ax + GT[0] * s + GN[0] * sd * (bd / 2 + 0.03), pz = az + GT[1] * s + GN[1] * sd * (bd / 2 + 0.03);
      S.box(px, pz, gTop + (door ? 0.05 : 0.9), gTop + (door ? 2.4 : 2.3), door ? 1.2 : 1.0, 0.06, ang, hex('#26231f'));
    }
    S.box(ax, az, gTop, gTop + 0.9, bw + 0.05, bd + 0.05, ang, shade(wash, 0.62)); // damp up the foot of the walls
    S.hip(ax, az, bw, bd, ang, gTop + bh, 2.3, roof, { over: 0.6, fascia: 0.2, fasciaCol: shade(roof, 0.8), ridgeCol: shade(roof, 1.2), hips: true });

    // overgrowth: shrubs along the gate's top and creepers down its city face
    S.kind = KIND.PLAIN;
    for (let k = 0; k < 14; k++) {
      const s = (rand(k, 21) - 0.5) * 32, v = (rand(k, 22) - 0.5) * 11;
      if (Math.abs(v) < bd / 2 + 1 && Math.abs(s - AXIS) < bw / 2 + 1) continue;
      const px = GATE_C[0] + GT[0] * s + GN[0] * v, pz = GATE_C[1] + GT[1] * s + GN[1] * v, r = 0.9 + rand(k, 23) * 1.4;
      S.cyl(px, pz, gTop - 0.1, gTop + r * 1.3, r, r * 0.45, 6, mix(ivy, ivy2, rand(k, 24)), { rot: rand(k, 25) * 3 });
    }
    for (let k = 0; k < 9; k++) {
      const s = (rand(k, 26) - 0.5) * 32, w = 1.2 + rand(k, 27) * 2.5, h = gTop - (1.5 + rand(k, 28) * 4);
      if (Math.abs(s - AXIS) < 2.5) continue;
      const px = GATE_C[0] + GT[0] * s - GN[0] * (GATE_HALF_D + 0.08), pz = GATE_C[1] + GT[1] * s - GN[1] * (GATE_HALF_D + 0.08);
      S.quad([px - GT[0] * w / 2, h, pz - GT[1] * w / 2], [px + GT[0] * w / 2, h, pz + GT[1] * w / 2], [px + GT[0] * w / 2, gTop + 0.1, pz + GT[1] * w / 2], [px - GT[0] * w / 2, gTop + 0.1, pz - GT[1] * w / 2], mix(ivy, ivy2, rand(k, 29)), [-GN[0], 0, -GN[1]]);
    }
  }
  S.kind = KIND.PLAIN;
}

// a wall face as it reads today: a damp foot, lichen and soot streaks from the top down, relaid patches
function weather(S, e, y0, y1, c, seed) {
  const off = 0.04, { a, len, ux, uz, nx, nz } = e;
  const face = (s0, s1, h0, h1, col) => {
    const x0 = a[0] + ux * s0 + nx * off, z0 = a[1] + uz * s0 + nz * off, x1 = a[0] + ux * s1 + nx * off, z1 = a[1] + uz * s1 + nz * off;
    S.quad([x0, h0, z0], [x1, h0, z1], [x1, h1, z1], [x0, h1, z0], col, [nx, 0.001, nz]);
  };
  const H = y1 - LAND_Y;
  face(0, len, y0, LAND_Y + 0.6 + rand(seed, 1) * 0.5, c.damp);
  for (let s = rand(seed, 2) * 6; s < len - 1; s += 4 + rand(seed + s, 3) * 7) {
    const w = Math.min(len - s, 1.5 + rand(seed + s, 4) * 4.5), k = rand(seed + s, 5);
    if (k < 0.55) face(s, s + w, LAND_Y + 0.6 + rand(seed + s, 6) * (H - 2), y1, mix(c.dark, c.lichen, rand(seed + s, 7) * 0.7));
    else if (k < 0.8) { const h = LAND_Y + 1.0 + rand(seed + s, 8) * (H - 3); face(s, Math.min(len, s + w * 1.5), h, h + 1.0 + rand(seed + s, 9) * 1.8, c.relaid); }
  }
}

// a 2 m passage under a 3 m round arch, seen on a wall face: a lime-washed surround, the dark mouth, and the rotting
// wooden doors set back in it. p: foot of the opening on the face; n: the face's outward normal; t: along the face.
function archway(S, px, pz, n, t) {
  const W = 2, H = 3, spring = H - W / 2;
  const shape = (half, top, off) => { // rectangle up to the springing, then a half circle
    const pts = [[-half, 0], [half, 0], [half, spring]];
    for (let k = 1; k < 8; k++) { const th = (k / 8) * Math.PI; pts.push([Math.cos(th) * half, spring + Math.sin(th) * (top - spring)]); }
    pts.push([-half, spring]);
    return pts.map(([u, v]) => [px + t[0] * u + n[0] * off, LAND_Y + v, pz + t[1] * u + n[1] * off]);
  };
  const ctr = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, LAND_Y + spring * 0.7, pts.reduce((s, p) => s + p[2], 0) / pts.length];
  const fill = (pts, col) => { const c = ctr(pts); for (let i = 0; i < pts.length; i++) S.tri(c, pts[i], pts[(i + 1) % pts.length], col, [n[0], 0, n[1]]); };
  fill(shape(W / 2 + 0.45, H + 0.45, 0.02), hex('#8d877a')); // the surround
  fill(shape(W / 2, H, 0.05), hex('#1d1b18')); // the mouth
  const door = hex('#4a3524');
  for (const sd of [-1, 1]) { // two leaves, one sagging open
    const u0 = sd * (W / 2 - 0.08), u1 = sd * (sd > 0 ? 0.15 : 0.02);
    const q = (u, v, o) => [px + t[0] * u + n[0] * o, LAND_Y + v, pz + t[1] * u + n[1] * o];
    S.quad(q(u0, 0.05, 0.07), q(u1, 0.05, sd > 0 ? 0.35 : 0.07), q(u1, spring - 0.1, sd > 0 ? 0.35 : 0.07), q(u0, spring - 0.1, 0.07), sd > 0 ? shade(door, 0.8) : door, [n[0], 0, n[1]]);
  }
}
