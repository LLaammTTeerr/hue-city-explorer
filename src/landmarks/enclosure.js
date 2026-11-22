import * as THREE from 'three';
import polygonClipping from 'polygon-clipping';
import { KIND, Buf, hex, shade } from '../geo/buf.js';
import { LAND_Y } from '../config.js';
import { rise } from '../geo/terrain.js';
import { glowPoints, lightMaterial } from '../geo/materials.js';

// Walls, railings and gates around the grounds of the city landmarks (Quốc Học, the churches, Ga Huế's forecourt,
// cung An Định, chùa Diệu Đế, the Thế Miếu compound), and the night lighting of those landmarks.
//
// A fence follows a ring (or an open line) from its own ground, bay by bay, and opens wherever a road or path of
// `data.roads` crosses it (as `crossings()` in tombs.js does) and wherever a gate model stands (`openings`).

const gY = (x, z) => LAND_Y + rise(x, z);
const RW = [15, 12, 9.5, 6.5, 4, 2.2]; // carriageway width by road class

// ---- night: one group handed to the scene's `dynamic` group by buildNguyenHoang (more.js), which main.js builds
// before every other landmark of these files; main.js gathers glows from `dynamic` only after
// all landmarks are built, so what is added here later is still picked up. ----
export const night = new THREE.Group();
night.name = 'civic-night';
const lampSets = new Map();
// a warm point light, shown after dark
export function lamp(x, y, z, col = [1, 0.8, 0.5], size = 4) {
  const k = size;
  if (!lampSets.has(k)) lampSets.set(k, { size, pos: [], col: [] });
  const s = lampSets.get(k);
  s.pos.push(x, y, z);
  s.col.push(col[0], col[1], col[2]);
}
// a strip of architectural light (geometry built in `L`, a Buf)
export function strips(L, color, boost = 1.6) {
  if (!L || L.n === 0) return;
  const m = new THREE.Mesh(L.geometry(), lightMaterial(color, boost));
  m.renderOrder = 19;
  m.userData.landmark = true; // counts towards label heights (scripts/lib/label-tops.mjs)
  night.add(m);
}
export function flushLamps() {
  for (const s of lampSets.values()) {
    if (!s.pos.length) continue;
    const p = glowPoints(s.pos, s.col, s.size);
    p.userData.glow = true;
    night.add(p);
  }
  lampSets.clear();
}

// ---- roads near a place, as segments [ax, az, bx, bz, width, class] ----
export function roadsNear(data, c, r) {
  const out = [];
  for (const [cl, bridge, flat] of data.roads || []) {
    if (bridge) continue;
    for (let i = 0; i + 3 < flat.length; i += 2) {
      const ax = flat[i] / 10, az = flat[i + 1] / 10, bx = flat[i + 2] / 10, bz = flat[i + 3] / 10;
      const mx = (ax + bx) / 2 - c[0], mz = (az + bz) / 2 - c[1], hl = Math.hypot(bx - ax, bz - az) / 2;
      if (Math.hypot(mx, mz) < r + hl) out.push([ax, az, bx, bz, RW[cl] || 2.2, cl]);
    }
  }
  return out;
}

// Is (x, z) on a mapped street near c? Streets are the classes city.js gives kerbs and pavements (0-3), bridges left
// out. `pad` widens the carriageway; pad 'pavement' takes in the pavement city.js draws beside it. A stair, landing or
// terrace that meets a street should stop where this turns false, not run on over the asphalt
// (scripts/check-overlap.mjs fails when a model stands on a carriageway).
export const PAVEMENT = (cl) => (cl <= 2 ? 1.8 : 1.2);
export function streetTest(data, c, r) {
  const segs = roadsNear(data, c, r).filter((s) => s[5] <= 3);
  return (x, z, pad = 0) => segs.some(([ax, az, bx, bz, w, cl]) => {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    return Math.hypot(ax + dx * t - x, az + dz * t - z) < w / 2 + (pad === 'pavement' ? PAVEMENT(cl) : pad);
  });
}

// A mapped outline (a precinct, a terrace) kept off the streets, as build-data.mjs trims mapped buildings: the ring
// less each street's carriageway plus `pad`, its largest piece kept. OSM draws a lane along a wall a metre or two
// into it; a model built on the raw outline would stand its wall on the asphalt.
export function offStreets(data, ring, pad = 0.3) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const c = [(x0 + x1) / 2, (z0 + z1) / 2], r = Math.hypot(x1 - x0, z1 - z0) / 2 + 10;
  const strips = [];
  for (const [ax, az, bx, bz, w, cl] of roadsNear(data, c, r)) {
    if (cl > 3) continue;
    const hw = w / 2 + pad, L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux, p = [];
    for (const [e, sg] of [[[bx, bz], 1], [[ax, az], -1]]) for (let k = 0; k <= 6; k++) {
      const t = (k * Math.PI) / 6, cs = Math.cos(t) * sg, sn = Math.sin(t) * sg;
      p.push([e[0] + hw * (cs * nx + sn * ux), e[1] + hw * (cs * nz + sn * uz)]);
    }
    // the strip's own box against the ring's (a long street along a side has both ends beyond the ring)
    if (Math.max(ax, bx) + hw > x0 && Math.min(ax, bx) - hw < x1 && Math.max(az, bz) + hw > z0 && Math.min(az, bz) - hw < z1) strips.push([[...p, p[0]]]);
  }
  if (!strips.length) return ring;
  let rest;
  try { rest = polygonClipping.difference([[...ring, ring[0]]], ...strips); } catch { return ring; }
  const area = (q) => { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] + q[i][0]) * (q[j][1] - q[i][1]); return Math.abs(a / 2); };
  let best = null;
  for (const pg of rest) { const q = pg[0].slice(0, -1); if (!best || area(q) > area(best)) best = q; }
  if (!best) return ring;
  // keep the original winding
  const sgn = (q) => { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] + q[i][0]) * (q[j][1] - q[i][1]); return Math.sign(a); };
  return sgn(best) === sgn(ring) ? best : best.reverse();
}

// A ring (a lawn, a court) cut to the part inside `bound` (the precinct it belongs to), its largest piece kept, in the
// ring's own winding; null when nothing is left. A bed or a paving laid out in a building's frame otherwise runs on
// past the precinct wall where the mapped outline is not square to that frame.
export function clipTo(ring, bound) {
  let rest;
  try { rest = polygonClipping.intersection([[...ring, ring[0]]], [[...bound, bound[0]]]); } catch { return ring; }
  const sa = (q) => { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] + q[i][0]) * (q[j][1] - q[i][1]); return a / 2; };
  let best = null;
  for (const pg of rest) { const q = pg[0].slice(0, -1); if (!best || Math.abs(sa(q)) > Math.abs(sa(best))) best = q; }
  if (!best || best.length < 3) return null;
  return Math.sign(sa(best)) === Math.sign(sa(ring)) ? best : best.reverse();
}

// where along a -> b (0..1) roads cross or gates stand, as merged [from, to] gaps
function gapsOf(a, b, len, roads, openings) {
  const dx = b[0] - a[0], dz = b[1] - a[1], gaps = [];
  for (const [px, pz, qx, qz, w] of roads) {
    const ex = qx - px, ez = qz - pz, den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) continue;
    const f = ((px - a[0]) * ez - (pz - a[1]) * ex) / den, g = ((px - a[0]) * dz - (pz - a[1]) * dx) / den;
    if (f < 0 || f > 1 || g < 0 || g > 1) continue;
    const sin = Math.abs(den) / (len * Math.hypot(ex, ez)), half = Math.min(8, (w / 2 + 0.8) / Math.max(0.35, sin)) / len;
    gaps.push([f - half, f + half]);
  }
  for (const [x, z, hw] of openings) {
    const t = ((x - a[0]) * dx + (z - a[1]) * dz) / (len * len);
    const px = a[0] + dx * t, pz = a[1] + dz * t;
    if (Math.hypot(x - px, z - pz) > 4 || t < -hw / len || t > 1 + hw / len) continue;
    gaps.push([t - hw / len, t + hw / len]);
  }
  gaps.sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const g of gaps) { const l = out[out.length - 1]; if (l && g[0] <= l[1] + 1.5 / len) l[1] = Math.max(l[1], g[1]); else out.push(g.slice()); }
  return out;
}

// Styles. h: height of the fence above ground; plinth: solid wall under a railing (rail: true) or the whole wall
// (rail: false); posts every `every` metres, `postW` square, standing `postUp` above the fence; gate piers `pierW`, `pierUp`.
export const FENCE = {
  // Quốc Học: low dark-red wall, dark iron railing, red piers with cream caps
  quochoc: { h: 2.0, plinth: 0.65, rail: true, t: 0.34, every: 3.4, postW: 0.48, postUp: 0.2, wall: hex('#9a2f27'), cap: hex('#efe2c4'), iron: hex('#24302b'), pierW: 1.0, pierUp: 1.2 },
  // churches: cream rendered wall, iron railing, grey piers
  church: { h: 1.9, plinth: 0.7, rail: true, t: 0.32, every: 3.2, postW: 0.45, postUp: 0.18, wall: hex('#e4ddcd'), cap: hex('#b9b5ab'), iron: hex('#2a2d30'), pierW: 1.0, pierUp: 1.5 },
  // An Định: ochre wall with cream-capped piers and railing panels
  andinh: { h: 2.2, plinth: 0.8, rail: true, t: 0.4, every: 3.6, postW: 0.55, postUp: 0.3, wall: hex('#d7b062'), cap: hex('#f3e8d2'), iron: hex('#3a3328'), pierW: 1.2, pierUp: 1.6 },
  // pagoda: solid yellow wall under a tile coping
  pagoda: { h: 2.1, plinth: 2.1, rail: false, t: 0.38, every: 4.0, postW: 0.55, postUp: 0.35, wall: hex('#e0c072'), cap: hex('#9c4c37'), iron: null, pierW: 0.9, pierUp: 1.4 },
  // Imperial City compounds: weathered brick-ochre wall under glazed coping
  imperial: { h: 3.0, plinth: 3.0, rail: false, t: 0.6, every: 6.0, postW: 0.8, postUp: 0.3, wall: hex('#b8945e'), cap: hex('#c79a3a'), iron: null, pierW: 1.3, pierUp: 1.5 },
  // station forecourt: knee-high railing between white posts
  station: { h: 1.1, plinth: 0.35, rail: true, t: 0.26, every: 2.8, postW: 0.32, postUp: 0.15, wall: hex('#e9e1d0'), cap: hex('#f5efe2'), iron: hex('#3b4a44'), pierW: 0.7, pierUp: 1.0 },
};

// Draw a fence along `pts`. Returns the piers either side of each opening, as [x, z, yTop].
const inRing = (x, z, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] > z !== r[j][1] > z && x < ((r[j][0] - r[i][0]) * (z - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
};
// mapped building outlines near a place (where a fence meets a gatehouse or a lodge, the building stands in the line)
export function buildingsNear(data, c, r) {
  const out = [];
  for (const b of data.bld || []) {
    const f = b[0];
    if (Math.hypot(f[0] / 10 - c[0], f[1] / 10 - c[1]) > r + 60) continue;
    const ring = [];
    for (let i = 0; i < f.length; i += 2) ring.push([f[i] / 10, f[i + 1] / 10]);
    out.push(ring);
  }
  return out;
}

// the stretches of a-b (as fractions) inside any of the outlines, or within `pad` of the line beside it (a fence
// running along a building's face is that face), sampled every 0.25 m
function solidSpans(a, b, len, solid, pad) {
  const out = [];
  if (!solid.length) return out;
  const near = solid.filter((r) => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    return Math.max(a[0], b[0]) + pad > x0 && Math.min(a[0], b[0]) - pad < x1 && Math.max(a[1], b[1]) + pad > z0 && Math.min(a[1], b[1]) - pad < z1;
  });
  if (!near.length) return out;
  const n = Math.max(2, Math.ceil(len / 0.25)), h = 0.5 / n, nx = (-(b[1] - a[1]) / len) * pad, nz = ((b[0] - a[0]) / len) * pad;
  let from = -1;
  for (let j = 0; j <= n; j++) {
    const t = j / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, inside = near.some((r) => inRing(x, z, r) || inRing(x + nx, z + nz, r) || inRing(x - nx, z - nz, r));
    if (inside && from < 0) from = Math.max(0, t - h);
    if (!inside && from >= 0) { out.push([from, t - h]); from = -1; }
  }
  if (from >= 0) out.push([from, 1]);
  return out;
}

export function fence(S, pts, st, { closed = true, roads = [], openings = [], solid = [], lampEvery = 0, lampCol = [1, 0.82, 0.55] } = {}) {
  const piers = [];
  const n = pts.length, m = closed ? n : n - 1;
  const keepKind = S.kind, keepBase = S.base;
  let sinceLamp = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.4) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const at = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    const gaps = gapsOf(a, b, len, roads, openings), runs = [];
    // the fence stops where a building stands in its line (no piers there): the stretches inside a solid outline
    // come off the runs, so a small gatehouse shorter than a bay still cuts the wall
    const cuts = [...gaps, ...solidSpans(a, b, len, solid, st.t / 2 + 0.2)].sort((p, q) => p[0] - q[0]);
    let f = 0;
    for (const [g0, g1] of cuts) { if (g0 > f) runs.push([f, Math.min(1, g0)]); f = Math.max(f, g1); }
    if (f < 1) runs.push([f, 1]);
    for (const [r0, r1] of runs) {
      const rl = (r1 - r0) * len;
      if (rl < 0.6) continue;
      const nb = Math.max(1, Math.round(rl / st.every));
      for (let k = 0; k < nb; k++) {
        const p = at(r0 + ((r1 - r0) * k) / nb), q = at(r0 + ((r1 - r0) * (k + 1)) / nb);
        const yp = gY(p[0], p[1]), yq = gY(q[0], q[1]), lo = Math.min(yp, yq) - 0.4, hi = Math.max(yp, yq);
        const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, bl = rl / nb;
        S.base = lo + 0.4 - LAND_Y;
        S.kind = KIND.MASONRY;
        if (st.rail) {
          S.box(mx, mz, lo, hi + st.plinth, bl, st.t, ang, st.wall, { top: st.cap });
          S.kind = KIND.PLAIN;
          // the railing: a see-through screen of bars reads, from the street and the air, as a dark band under a rail
          S.box(mx, mz, hi + st.plinth, hi + st.h - 0.08, bl - st.postW, 0.05, ang, st.iron);
          S.box(mx, mz, hi + st.h - 0.12, hi + st.h, bl, 0.09, ang, shade(st.iron, 1.2));
        } else {
          S.box(mx, mz, lo, hi + st.h - 0.18, bl + 0.02, st.t, ang, st.wall, { top: st.cap });
          S.kind = KIND.TILE;
          S.box(mx, mz, hi + st.h - 0.18, hi + st.h, bl + 0.05, st.t + 0.24, ang, st.cap, { taper: 0.55 });
        }
        // a post at the start of each bay, and at the end of the run
        const posts = k === nb - 1 ? [p, q] : [p];
        for (const o of posts) {
          const y = gY(o[0], o[1]);
          S.kind = KIND.MASONRY;
          S.box(o[0], o[1], y - 0.4, y + st.h + st.postUp, st.postW, st.postW, ang, st.postCol || st.wall, { top: st.cap }); // st.postCol: posts and piers in their own colour (optional)
          if (k % 2 === 0) { S.kind = KIND.PLAIN; S.box(o[0], o[1], y + st.h + st.postUp, y + st.h + st.postUp + 0.12, st.postW + 0.12, st.postW + 0.12, ang, st.cap); } // a cap on every other post (keeps the count down)
          sinceLamp += 1;
          if (lampEvery && sinceLamp % lampEvery === 0) lamp(o[0], y + st.h + st.postUp + 0.35, o[1], lampCol, 3);
        }
      }
    }
    // gate piers either side of each opening
    for (const [g0, g1] of gaps) for (const fp of [g0, g1]) {
      if (fp <= 0.005 || fp >= 0.995) continue;
      const p = at(fp), y = gY(p[0], p[1]), top = y + st.h + st.pierUp;
      if (solid.some((r) => inRing(p[0], p[1], r))) continue; // a gatehouse frames the opening itself
      S.base = y - LAND_Y;
      S.kind = KIND.MASONRY;
      S.box(p[0], p[1], y - 0.4, top, st.pierW, st.pierW, ang, st.postCol || st.wall, { top: st.cap });
      S.kind = KIND.PLAIN;
      S.box(p[0], p[1], top, top + 0.18, st.pierW + 0.2, st.pierW + 0.2, ang, st.cap);
      S.box(p[0], p[1], top + 0.18, top + 0.5, st.pierW * 0.55, st.pierW * 0.55, ang, st.cap, { taper: 0.5 });
      piers.push([p[0], p[1], top + 0.5]);
    }
  }
  S.kind = keepKind;
  S.base = keepBase;
  return piers;
}

// An oriented yard around a building where OSM maps no grounds: a rectangle in frame terms (a along the front
// direction f, b along the facade p) between [a0, a1] x [b0, b1], pulled in wherever a street (class 0-3) runs
// through it, but never into the core [ca0, ca1] x [cb0, cb1] the building and its forecourt need.
export function yard(F, roads, a0, a1, b0, b1, ca0, ca1, cb0, cb1, blds = []) {
  const loc = (x, z) => { const dx = x - F.c[0], dz = z - F.c[1]; return [dx * F.f[0] + dz * F.f[1], dx * F.p[0] + dz * F.p[1]]; };
  for (const [ax, az, bx, bz, w, cl] of roads) {
    if (cl > 3) continue;
    const L = Math.hypot(bx - ax, bz - az), ns = Math.max(1, Math.ceil(L / 2));
    for (let k = 0; k <= ns; k++) {
      const [a, b] = loc(ax + ((bx - ax) * k) / ns, az + ((bz - az) * k) / ns), hw = w / 2 + 1.5;
      if (a < a0 - hw || a > a1 + hw || b < b0 - hw || b > b1 + hw) continue;
      const moves = [];
      if (a - hw >= ca1) moves.push([a1 - (a - hw), () => (a1 = a - hw)]);
      if (a + hw <= ca0) moves.push([a + hw - a0, () => (a0 = a + hw)]);
      if (b - hw >= cb1) moves.push([b1 - (b - hw), () => (b1 = b - hw)]);
      if (b + hw <= cb0) moves.push([b + hw - b0, () => (b0 = b + hw)]);
      if (!moves.length) continue; // a street through the core: the fence opens for it instead
      moves.sort((p, q) => p[0] - q[0])[0][1]();
    }
  }
  // mapped buildings: one standing wholly inside the yard or wholly outside it is left alone; one the fence line would
  // cut through is put outside, by pulling in the nearest side that clears the core (a building that reaches into the
  // core stays cut: the fence breaks at its walls)
  const PAD = 1.2;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const ring of blds) {
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity, inside = 0;
      for (const [x, z] of ring) {
        const [a, b] = loc(x, z);
        u0 = Math.min(u0, a); u1 = Math.max(u1, a); v0 = Math.min(v0, b); v1 = Math.max(v1, b);
        if (a > a0 && a < a1 && b > b0 && b < b1) inside++;
      }
      if (u1 <= a0 || u0 >= a1 || v1 <= b0 || v0 >= b1) continue; // clear of the yard
      if (inside === ring.length && u0 > a0 + PAD && u1 < a1 - PAD && v0 > b0 + PAD && v1 < b1 - PAD) continue; // within it
      const moves = [];
      if (u0 - PAD >= ca1) moves.push([a1 - (u0 - PAD), () => (a1 = u0 - PAD)]);
      if (u1 + PAD <= ca0) moves.push([u1 + PAD - a0, () => (a0 = u1 + PAD)]);
      if (v0 - PAD >= cb1) moves.push([b1 - (v0 - PAD), () => (b1 = v0 - PAD)]);
      if (v1 + PAD <= cb0) moves.push([v1 + PAD - b0, () => (b0 = v1 + PAD)]);
      if (!moves.length) continue;
      moves.sort((p, q) => p[0] - q[0])[0][1]();
      moved = true;
    }
    if (!moved) break;
  }
  return { a0, a1, b0, b1, ring: [F.at(a0, b0), F.at(a1, b0), F.at(a1, b1), F.at(a0, b1)] };
}

// A pair of gate leaves in an opening (wrought iron, closed), between two piers
export function leaves(S, p, q, y, h, col) {
  const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), len = Math.hypot(q[0] - p[0], q[1] - p[1]);
  const keep = S.kind;
  S.kind = KIND.PLAIN;
  for (const s of [0.25, 0.75]) {
    const x = p[0] + (q[0] - p[0]) * s, z = p[1] + (q[1] - p[1]) * s;
    S.box(x, z, y, y + h, len / 2 - 0.1, 0.06, ang, col);
  }
  S.kind = keep;
}

export const lightBuf = () => new Buf(256);
