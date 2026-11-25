// Is there room for a boat here? An exact test of a boat's box against static structure faces, shared by the boats'
// routing (landmarks/boats.js: lanes that thread the bridge spans, turns where there is water to turn in) and the
// geometry check that holds every boat to it (scripts/check-boats.mjs).
//
// A boat is the box of its hull (local +x the bow, rotation.y = yaw, as the boats are drawn) from just above the
// waterline to its roof, shrunk by SLACK on every side. A face reaching into the box is a hit; faces are clipped by the
// box's six planes, so a deck passing overhead with clearance, or a pier beside the hull, is no hit.

export const WATERLINE = 0.15; // the hull below this is in the water, where the river surface and the beds of the banks are
const SLACK = 0.1;
const G = 10; // grid cell (m)
const cellKey = (x, z) => (x + 32768) * 65536 + (z + 32768);

// faces: an object collecting triangles. add(v, tag, o) takes 9 floats at offset o of v (x y z × 3); only faces that
// rise above the waterline, lie below top and (with keep) pass keep(x0, z0, x1, z1) are kept. Ground and water sheets
// (wider than 400 m) are left out: the boats' own water and the land are not obstacles here.
export function makeObstacles({ top = Infinity, keep = null } = {}) {
  const tri = [], tags = [], grid = new Map();
  return {
    add(v, tag = null, o = 0) {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let k = o; k < o + 9; k += 3) {
        const x = v[k], y = v[k + 1], z = v[k + 2];
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (y1 < WATERLINE || y0 > top || x1 - x0 > 400 || z1 - z0 > 400 || !(x1 >= x0)) return;
      if (keep && !keep(x0, z0, x1, z1)) return;
      const i = tags.length;
      for (let k = o; k < o + 9; k++) tri.push(v[k]);
      tags.push(tag);
      for (let x = Math.floor(x0 / G); x <= Math.floor(x1 / G); x++) for (let z = Math.floor(z0 / G); z <= Math.floor(z1 / G); z++) {
        const k = cellKey(x, z);
        const c = grid.get(k);
        if (c) c.push(i); else grid.set(k, [i]);
      }
    },
    // the faces reaching into a boat box: centre (x, z), heading yaw, local bounds lo/hi ([x, y, z], y in world
    // metres), drawn at scale. Returns [] when clear, else [{ tag, y }] with the highest point of each face inside.
    // first: stop at the first hit (the routing only asks whether there is one).
    hits(x, z, yaw, lo, hi, scale = 1, first = false) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      L[0] = lo[0] * scale + SLACK; L[1] = Math.max(WATERLINE, lo[1] * scale); L[2] = lo[2] * scale + SLACK;
      H[0] = hi[0] * scale - SLACK; H[1] = hi[1] * scale - SLACK; H[2] = hi[2] * scale - SLACK;
      const r = Math.hypot(Math.max(-L[0], H[0]), Math.max(-L[2], H[2]));
      const out = [];
      grow(tags.length);
      if (++stamp > 0xfffffff0) { seen.fill(0); stamp = 1; }
      for (let gx = Math.floor((x - r) / G); gx <= Math.floor((x + r) / G); gx++) for (let gz = Math.floor((z - r) / G); gz <= Math.floor((z + r) / G); gz++) {
        const cell = grid.get(cellKey(gx, gz));
        if (!cell) continue;
        for (const i of cell) {
          if (seen[i] === stamp) continue;
          seen[i] = stamp;
          // world → boat frame: rotation.y = yaw turns local (lx, lz) to world (lx c + lz s, −lx s + lz c)
          let poly = [];
          for (let k = 0; k < 3; k++) {
            const dx = tri[i * 9 + k * 3] - x, dz = tri[i * 9 + k * 3 + 2] - z;
            poly.push([dx * c - dz * s, tri[i * 9 + k * 3 + 1], dx * s + dz * c]);
          }
          for (let ax = 0; ax < 3 && poly.length; ax++) { poly = clip(poly, ax, L[ax], -1); if (poly.length) poly = clip(poly, ax, H[ax], 1); }
          if (poly.length < 3 || area(poly) < 0.01) continue; // a sliver along a box face is contact, not a hit
          let y = -Infinity;
          for (const p of poly) if (p[1] > y) y = p[1];
          out.push({ tag: tags[i], y });
          if (first) return out;
        }
      }
      return out;
    },
    get size() { return tags.length; },
  };
}
// scratch shared by every set of obstacles (the tests run one at a time): the box bounds, and which faces this test
// has already clipped (a face spanning several cells is listed in each)
const L = [0, 0, 0], H = [0, 0, 0];
let seen = new Uint32Array(0), stamp = 0;
const grow = (n) => { if (seen.length < n) { seen = new Uint32Array(Math.max(n, seen.length * 2)); stamp = 0; } };

// the part of poly on the inside (sign −1: coordinate ≥ lim; +1: ≤ lim) of one box plane
function clip(poly, axis, lim, sign) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = sign * (lim - p[axis]), dq = sign * (lim - q[axis]); // ≥ 0 inside
    if (dp >= 0) out.push(p);
    if (dp >= 0 !== dq >= 0) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]); }
  }
  return out;
}
function area(poly) {
  let a = 0;
  const o = poly[0];
  for (let k = 1; k + 1 < poly.length; k++) {
    const u0 = poly[k][0] - o[0], u1 = poly[k][1] - o[1], u2 = poly[k][2] - o[2];
    const w0 = poly[k + 1][0] - o[0], w1 = poly[k + 1][1] - o[1], w2 = poly[k + 1][2] - o[2];
    a += Math.hypot(u1 * w2 - u2 * w1, u2 * w0 - u0 * w2, u0 * w1 - u1 * w0) / 2;
  }
  return a;
}
