import * as THREE from 'three';
import { Buf, KIND, hex, shade, unflat, obb, ringCentre, signedArea, inRing } from '../geo/buf.js';
import { gateAxis, CITADEL_PASSAGE } from '../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';
import { lightMaterial, glowPoints, shared } from '../geo/materials.js';
import { landTest } from './boats.js';
import { replaced } from './places/index.js';
import { flag as makeFlag } from './anim.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dark = hex('#2b2422');

// Timber hall under a swept tiled roof; tiers = 2 gives the stacked roofs of gate towers and pavilions.
// With colonnade (on by default once the hall is big enough) w × d is the outer column line: the closed timber core
// stands 1-1.4 m inside it, and round lacquered columns on stone bases carry the eaves around the verandah.
export function pavilion(S, cx, cz, w, d, ang, y0, { tiers = 1, wallH = 3.6, roof = PAL.imperialRoof, wall = PAL.lacquer, over = 1.5, rh = null, platform = 0, ridge = RIDGE, eaves = null, colonnade = false, steps = true, segs = 2 } = {}) {
  let y = y0;
  const keep = S.kind;
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const P = (u, v) => [cx + u * ux - v * uz, cz + u * uz + v * ux];
  if (platform) {
    S.kind = KIND.MASONRY;
    S.box(cx, cz, y, y + platform, w + 3.4, d + 3.4, ang, PAL.stone, { taper: 0.97, topKind: KIND.ROAD });
    if (steps && platform >= 0.3) {
      // a flight up the middle of the front and back, between low stone cheek walls
      const n = Math.max(2, Math.round(platform / 0.17)), stepH = platform / n, tread = 0.32;
      const sw = clamp(w * 0.32, 1.6, 4.4), edge = d / 2 + 1.7 - 0.06;
      for (const sg of [-1, 1]) {
        S.kind = KIND.MASONRY;
        for (let k = 1; k < n; k++) {
          const q = P(0, sg * (edge + tread * (k - 0.5)));
          S.box(q[0], q[1], y - 0.3, y + platform - stepH * k, sw, tread, ang, shade(PAL.stone, 1.05), { topKind: KIND.ROAD });
        }
        S.kind = KIND.PLAIN;
        const run = tread * (n - 1);
        for (const s2 of [-1, 1]) {
          const a = P(s2 * (sw / 2 + 0.2), sg * (edge - 0.3)), b = P(s2 * (sw / 2 + 0.2), sg * (edge + run + 0.05));
          S.box(a[0], a[1], y - 0.3, y + platform + 0.28, 0.4, 0.6, ang, shade(PAL.stone, 0.92));
          S.beam([a[0], y + platform + 0.12, a[1]], [b[0], y + 0.1, b[1]], 0.36, 0.34, shade(PAL.stone, 0.92));
        }
      }
    }
    y += platform;
  }
  const open = colonnade && Math.min(w, d) >= 4.5;
  if (open) {
    const inset = clamp(Math.min(w, d) * 0.13, 1.0, 1.4);
    const cw = w - inset * 2, cd = d - inset * 2, lidY = y + wallH - 0.2;
    // the closed core, with a pair of darker lacquered door leaves on the front and back
    S.kind = KIND.TIMBER;
    S.box(cx, cz, y, lidY, cw, cd, ang, wall, { top: shade(roof, 0.8) });
    S.kind = KIND.PLAIN;
    const dw = Math.min(cw * 0.3, 3.2), dh = Math.min(wallH * 0.78, 3.4);
    for (const sg of [-1, 1]) {
      const q = P(0, sg * (cd / 2 + 0.04));
      S.box(q[0], q[1], y, y + dh, dw, 0.08, ang, shade(wall, 0.55));
      const f = P(0, sg * (cd / 2 + 0.06));
      S.box(f[0], f[1], y + dh, y + dh + 0.22, dw + 0.5, 0.12, ang, shade(wall, 0.75));
    }
    // the verandah ceiling: a thin dark lid over the column line, seen from below
    S.box(cx, cz, lidY, y + wallH, w, d, ang, shade(wall, 0.5), { top: shade(roof, 0.8), bottom: true });
    // round columns on stone bases (đá tảng), spaced about 3.6 m round the verandah
    const r = clamp(Math.min(w, d) * 0.028, 0.18, 0.3);
    const nu = Math.max(2, Math.round(w / 3.6)), nv = Math.max(2, Math.round(d / 3.6));
    const posts = [];
    for (let i = 0; i <= nu; i++) for (const sg of [-1, 1]) posts.push([-w / 2 + (w * i) / nu, (sg * d) / 2]);
    for (let i = 1; i < nv; i++) for (const sg of [-1, 1]) posts.push([(sg * w) / 2, -d / 2 + (d * i) / nv]);
    const ty = lidY - 0.36;
    for (const [u, v] of posts) {
      const q = P(u, v);
      S.cyl(q[0], q[1], y, y + 0.26, r * 1.8, r * 1.55, 6, shade(PAL.stone, 0.95), { cap: false, rot: ang });
      S.cyl(q[0], q[1], y + 0.26, lidY, r, r * 0.92, 6, shade(wall, 0.92), { cap: false, rot: ang });
      // a tie beam from each column back to the core
      const cu = clamp(u, -cw / 2, cw / 2), cv = clamp(v, -cd / 2, cd / 2), c2 = P(cu, cv);
      if (Math.hypot(u - cu, v - cv) > 0.3) S.beam([q[0], ty, q[1]], [c2[0], ty, c2[1]], r * 1.1, 0.3, shade(wall, 0.7));
    }
    // and the perimeter beam along the column heads
    const C = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    for (let i = 0; i < 4; i++) { const a = C[i], b = C[(i + 1) % 4]; S.beam([a[0], ty, a[1]], [b[0], ty, b[1]], r * 1.3, 0.34, shade(wall, 0.7)); }
  } else {
    S.kind = KIND.TIMBER;
    S.box(cx, cz, y, y + wallH, w, d, ang, wall, { top: shade(roof, 0.8) });
  }
  S.kind = KIND.TIMBER;
  y += wallH;
  const h1 = rh ?? clamp(d * 0.3, 1.5, 5.2);
  const eave = { fascia: 0.3, fasciaCol: shade(wall, 0.75), ridgeCol: ridge, hips: true, glazed: true, segs };
  let top;
  if (tiers === 1) {
    S.hip(cx, cz, w, d, ang, y, h1, roof, { flare: 0.55, over, ...eave });
    if (eaves) eaves.push({ cx, cz, w, d, ang, y, over, fascia: eave.fascia });
    top = y + h1;
  } else {
    S.hip(cx, cz, w, d, ang, y, h1 * 0.8, roof, { flare: 0.5, over, ...eave, ridgeCol: null });
    const w2 = w * 0.68, d2 = d * 0.62, y2 = y + h1 * 0.42;
    S.box(cx, cz, y2, y2 + wallH * 0.62, w2, d2, ang, wall);
    const y3 = y2 + wallH * 0.62;
    S.hip(cx, cz, w2, d2, ang, y3, h1 * 0.85, roof, { flare: 0.5, over: over * 0.85, ...eave });
    if (eaves) eaves.push({ cx, cz, w, d, ang, y, over, fascia: eave.fascia }, { cx, cz, w: w2, d: d2, ang, y: y3, over: over * 0.85, fascia: eave.fascia });
    top = y3 + h1 * 0.85;
  }
  S.kind = keep;
  return top;
}
const RIDGE = hex('#f1d77a');

// ---- night lighting: thin strips of additive light laid just proud of the stone and timber they wash ----
const W1 = [1, 1, 1];
const LANTERN = [1.0, 0.72, 0.34];
// a strip along every edge of a ring (any winding), pushed out from each face by `out`
function ringStrip(L, ring, y, out = 0.12, w = 0.16, h = 0.26) {
  const s = signedArea(ring) > 0 ? 1 : -1;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz);
    if (l < 0.3) continue;
    const nx = (tz * s) / l, nz = (-tx * s) / l;
    L.beam([a[0] + nx * out, y, a[1] + nz * out], [b[0] + nx * out, y, b[1] + nz * out], w, h, W1);
  }
}
// a strip just under the soffit of a pavilion roof (an entry recorded by pavilion()), near the eave's edge.
// sides: any of 'v-', 'v+' (the long sides, running along the roof's axis) and 'u-', 'u+' (the gable ends).
function eaveStrip(L, e, sides = ['v-', 'v+', 'u-', 'u+'], w = 0.14, h = 0.1) {
  const ux = Math.cos(e.ang), uz = Math.sin(e.ang);
  const y = e.y - e.fascia - 0.07;
  const P = (u, v) => [e.cx + u * ux - v * uz, y, e.cz + u * uz + v * ux];
  const hu = e.w / 2 + e.over - 0.3, hv = e.d / 2 + e.over - 0.3;
  for (const sd of sides) {
    const sg = sd[1] === '+' ? 1 : -1;
    if (sd[0] === 'v') L.beam(P(-hu, sg * hv), P(hu, sg * hv), w, h, W1);
    else L.beam(P(sg * hu, -hv), P(sg * hu, hv), w, h, W1);
  }
}
// which face of an oriented box looks most toward `dir`: its outward normal, half-depth and half-width along it
function faceToward(o, dir) {
  const ux = Math.cos(o.a), uz = Math.sin(o.a);
  const du = dir[0] * ux + dir[1] * uz, dv = -dir[0] * uz + dir[1] * ux;
  if (Math.abs(du) > Math.abs(dv)) { const s = Math.sign(du) || 1; return { n: [ux * s, uz * s], t: [-uz, ux], half: o.w / 2, side: o.d / 2 }; }
  const s = Math.sign(dv) || 1;
  return { n: [-uz * s, ux * s], t: [ux, uz], half: o.d / 2, side: o.w / 2 };
}
function lightMesh(group, L, color, boost) {
  if (!group || !L || L.n === 0) return null;
  const m = new THREE.Mesh(L.geometry(), lightMaterial(color, boost));
  m.renderOrder = 19;
  m.userData.landmark = true; // counts towards label heights (scripts/lib/label-tops.mjs)
  group.add(m);
  return m;
}
function lampPoints(group, pos, col, size, glows) {
  if (!group || !pos.length) return null;
  const p = glowPoints(pos, col, size);
  p.userData.glow = true;
  group.add(p);
  glows.push(p);
  return p;
}

// corners of an oriented rectangle, as a ring
const rect = (cx, cz, w, d, a) => { const ux = Math.cos(a), uz = Math.sin(a); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [cx + (ux * i * w) / 2 - (uz * j * d) / 2, cz + (uz * i * w) / 2 + (ux * j * d) / 2]); };

// ---- passages through masonry ----
// Walls of a solid ring from y0 to y1 (no top: draw that separately) with passages driven straight through it.
// Each opening: { p: a point on its axis, dir: unit axis [x, z], w, h (crown above floor), floor, arch }. Where the
// axis enters and leaves the ring the wall is cut, and between the two cuts a lined tunnel is built: lighter stone
// at each mouth, dark inside, a paved floor, flat ceiling or barrel vault; a proud stone surround frames each mouth.
// An opening whose sides do not both land on one edge (near a corner) is skipped. Returns the openings built.
const STONE_DARK = hex('#1f1a18');
function passages(S, ring0, y0, y1, wallCol, openings, { frame = hex('#d6cbb5'), proud = 0.16, covers = null, porchTop = null } = {}) {
  // OSM outlines carry runs of nearly collinear short edges; merge them so a cut lands on one straight face
  const ring = ring0.slice();
  for (let changed = true; changed && ring.length > 3; ) {
    changed = false;
    for (let i = 0; i < ring.length && ring.length > 3; i++) {
      const p = ring[(i + ring.length - 1) % ring.length], q = ring[i], r = ring[(i + 1) % ring.length];
      const ex = r[0] - p[0], ez = r[1] - p[1], el = Math.hypot(ex, ez);
      if (el < 1e-6 || Math.abs((q[0] - p[0]) * ez - (q[1] - p[1]) * ex) / el < 0.12) { ring.splice(i, 1); changed = true; i--; }
    }
  }
  const n = ring.length;
  const out = signedArea(ring) > 0 ? 1 : -1;
  const cuts = ring.map(() => []);
  const tunnels = [];
  const hit = (p, dir, a, b) => {
    // p + dir·t = a + (b - a)·s
    const ex = b[0] - a[0], ez = b[1] - a[1], den = dir[0] * ez - dir[1] * ex;
    if (Math.abs(den) < 1e-6) return null;
    const qx = a[0] - p[0], qz = a[1] - p[1];
    return { t: (qx * ez - qz * ex) / den, s: (qx * dir[1] - qz * dir[0]) / den };
  };
  for (const op of openings) {
    const nr = [-op.dir[1], op.dir[0]];
    const line = (o) => [op.p[0] + nr[0] * o, op.p[1] + nr[1] * o];
    const hits = [];
    for (let i = 0; i < n; i++) { const h = hit(line(0), op.dir, ring[i], ring[(i + 1) % n]); if (h && h.s >= 0 && h.s < 1) hits.push({ i, t: h.t }); }
    hits.sort((a, b) => a.t - b.t);
    if (hits.length < 2 || hits.length % 2) continue;
    let ok = true;
    const H = hits.map(({ i, t }) => {
      const a = ring[i], b = ring[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const l = hit(line(-op.w / 2), op.dir, a, b), r = hit(line(op.w / 2), op.dir, a, b);
      if (!l || !r) { ok = false; return null; }
      const sl = l.s * len, sr = r.s * len, s0 = Math.min(sl, sr), s1 = Math.max(sl, sr);
      if (s0 < 0.6 || s1 > len - 0.6) ok = false;
      for (const c of cuts[i]) if (s0 < c.s1 + 0.8 && s1 > c.s0 - 0.8) ok = false;
      const pt = (s) => [a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len];
      return { i, t, s0, s1, L: pt(sl), R: pt(sr) };
    });
    if (!ok) continue;
    for (const h of H) cuts[h.i].push({ s0: h.s0, s1: h.s1, op });
    for (let k = 0; k < H.length; k += 2) tunnels.push({ op, A: H[k], B: H[k + 1] });
  }
  // the walls, cut where a passage goes through
  const keep = S.kind;
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    const tx = b[0] - a[0], tz = b[1] - a[1], len = Math.hypot(tx, tz);
    if (len < 1e-3) continue;
    const hint = [tz * out, 0.001, -tx * out];
    const at = (s, y) => [a[0] + (tx * s) / len, y, a[1] + (tz * s) / len];
    const wq = (sa, sb, ya, yb) => { if (sb - sa > 1e-3 && yb - ya > 1e-3) S.quad(at(sa, ya), at(sb, ya), at(sb, yb), at(sa, yb), wallCol, hint); };
    const cs = cuts[i].sort((p, q) => p.s0 - q.s0);
    let cur = 0;
    for (const c of cs) {
      const { op } = c, fl = op.floor, crown = fl + op.h;
      wq(cur, c.s0, y0, y1);
      wq(c.s0, c.s1, y0, fl);
      wq(c.s0, c.s1, crown, y1);
      if (op.arch) {
        // (an ellipse when the passage meets the face at a slant, so it matches the vault's height)
        const r = (c.s1 - c.s0) / 2, ry = op.w / 2, m = (c.s0 + c.s1) / 2, spring = crown - ry, N = 8;
        for (let k = 0; k < N; k++) {
          const t0 = Math.PI - (Math.PI * k) / N, t1 = Math.PI - (Math.PI * (k + 1)) / N;
          const x0 = m + r * Math.cos(t0), x1 = m + r * Math.cos(t1);
          S.quad(at(x0, spring + ry * Math.sin(t0)), at(x1, spring + ry * Math.sin(t1)), at(x1, crown), at(x0, crown), wallCol, hint);
        }
      }
      // the stone surround, standing proud of the face
      const nx = (tz * out) / len, nz = (-tx * out) / len, ea = Math.atan2(tz, tx);
      const S2 = S.kind; S.kind = KIND.PLAIN;
      const fb = (s, w, ya, yb) => { const q = at(s, 0); S.box(q[0] + nx * proud / 2, q[2] + nz * proud / 2, ya, yb, w, proud, ea, frame); };
      const jw = 0.45, sp = op.arch ? crown - op.w / 2 : crown;
      fb(c.s0 - jw / 2, jw, fl, sp);
      fb(c.s1 + jw / 2, jw, fl, sp);
      if (!op.arch) fb((c.s0 + c.s1) / 2, c.s1 - c.s0 + jw * 2 + 0.3, crown, Math.min(y1, crown + 0.55));
      else {
        const r = (c.s1 - c.s0) / 2, ry = op.w / 2, m = (c.s0 + c.s1) / 2, N = 8, ro = r + jw, ryo = ry + jw;
        const off = (s, y, d) => { const q = at(s, y); return [q[0] + nx * d, y, q[2] + nz * d]; };
        for (let k = 0; k < N; k++) {
          const t0 = Math.PI - (Math.PI * k) / N, t1 = Math.PI - (Math.PI * (k + 1)) / N;
          const ia = [m + r * Math.cos(t0), sp + ry * Math.sin(t0)], ib = [m + r * Math.cos(t1), sp + ry * Math.sin(t1)];
          const oa = [m + ro * Math.cos(t0), sp + ryo * Math.sin(t0)], ob = [m + ro * Math.cos(t1), sp + ryo * Math.sin(t1)];
          S.quad(off(ia[0], ia[1], proud), off(ib[0], ib[1], proud), off(ob[0], ob[1], proud), off(oa[0], oa[1], proud), frame, [nx, 0, nz]);
          const cx2 = (ia[0] + ib[0]) / 2 - m, cy2 = (ia[1] + ib[1]) / 2 - sp, cl = Math.hypot(cx2, cy2) || 1;
          // inner and outer edges of the band
          const iv = [-(cx2 / cl) * (tx / len), -cy2 / cl, -(cx2 / cl) * (tz / len)];
          S.quad(off(ia[0], ia[1], 0), off(ib[0], ib[1], 0), off(ib[0], ib[1], proud), off(ia[0], ia[1], proud), shade(frame, 0.8), iv);
          S.quad(off(oa[0], oa[1], 0), off(ob[0], ob[1], 0), off(ob[0], ob[1], proud), off(oa[0], oa[1], proud), frame, [-iv[0], -iv[1], -iv[2]]);
        }
      }
      S.kind = S2;
      cur = c.s1;
    }
    wq(cur, len, y0, y1);
  }
  // the tunnels
  S.kind = KIND.PLAIN;
  for (const { op, A, B } of tunnels) {
    const fl = op.floor, crown = fl + op.h, r = op.w / 2, spring = op.arch ? crown - r : crown;
    const len = Math.abs(B.t - A.t), m = Math.min(0.5, 0.85 / Math.max(len, 1));
    const lerp = (p, q, f) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f];
    const segs = [[0, m, 0.5], [m, 1 - m, 0], [1 - m, 1, 0.5]];
    const mouth = shade(frame, 0.62);
    for (const [f0, f1, lt] of segs) {
      if (f1 - f0 < 1e-3) continue;
      const col = lt ? mouth : STONE_DARK;
      const L0 = lerp(A.L, B.L, f0), L1 = lerp(A.L, B.L, f1), R0 = lerp(A.R, B.R, f0), R1 = lerp(A.R, B.R, f1);
      const toR = [R0[0] - L0[0], 0, R0[1] - L0[1]];
      S.quad([L0[0], fl, L0[1]], [L1[0], fl, L1[1]], [L1[0], spring, L1[1]], [L0[0], spring, L0[1]], col, toR);
      S.quad([R0[0], fl, R0[1]], [R1[0], fl, R1[1]], [R1[0], spring, R1[1]], [R0[0], spring, R0[1]], col, [-toR[0], 0, -toR[2]]);
      S.kind = KIND.ROAD;
      S.quad([L0[0], fl, L0[1]], [L1[0], fl, L1[1]], [R1[0], fl, R1[1]], [R0[0], fl, R0[1]], lt ? shade(PAL.stone, 0.8) : shade(PAL.stone, 0.42), [0, 1, 0]);
      S.kind = KIND.PLAIN;
      if (!op.arch) S.quad([L0[0], crown, L0[1]], [L1[0], crown, L1[1]], [R1[0], crown, R1[1]], [R0[0], crown, R0[1]], shade(col, 0.8), [0, -1, 0]);
      else {
        const N = 8;
        const v = (f, th) => { const l = lerp(L0, L1, f), rr = lerp(R0, R1, f), q = lerp(l, rr, (1 - Math.cos(th)) / 2); return [q[0], spring + r * Math.sin(th), q[1]]; };
        const ax = lerp(lerp(L0, R0, 0.5), lerp(L1, R1, 0.5), 0.5);
        for (let k = 0; k < N; k++) {
          const t0 = Math.PI - (Math.PI * k) / N, t1 = Math.PI - (Math.PI * (k + 1)) / N;
          const a0 = v(0, t0), b0 = v(0, t1), a1 = v(1, t0);
          const cxq = (a0[0] + b0[0]) / 2, cyq = (a0[1] + b0[1]) / 2, czq = (a0[2] + b0[2]) / 2;
          S.quad(a0, b0, v(1, t1), a1, shade(col, 0.85), [ax[0] - cxq, spring - cyq, ax[1] - czq]);
        }
      }
    }
  }
  // where other masonry stands across a mouth (the rampart, the Imperial City wall), a porch is built out past its face
  // with the passage carried through it, and the passage goes on as a dark opening in that face
  if (covers) {
    for (const { op, A, B } of tunnels) {
      for (const [E, sg] of [[A, -1], [B, 1]]) {
        const M = [op.p[0] + op.dir[0] * E.t, op.p[1] + op.dir[1] * E.t], od = [op.dir[0] * sg, op.dir[1] * sg];
        let f = 0;
        for (const [a, b] of covers) { const h = hit(M, od, a, b); if (h && h.s >= 0 && h.s <= 1 && h.t > 0.05 && h.t < 4.5) f = Math.max(f, h.t); }
        if (!f) continue;
        const dep = 1.2, pc = [M[0] + od[0] * (f + dep / 2), M[1] + od[1] * (f + dep / 2)];
        const pr = rect(pc[0], pc[1], dep, op.w + 1.7, Math.atan2(od[1], od[0]));
        const ptop = Math.min(porchTop ?? y1, op.floor + op.h + 1.0);
        S.kind = KIND.MASONRY;
        S.prism(pr, ptop, ptop, wallCol, shade(wallCol, 1.08));
        passages(S, pr, y0, ptop, wallCol, [{ ...op, p: pc }], { frame, proud });
        // the passage seen on into the wall behind
        S.kind = KIND.PLAIN;
        const F = [M[0] + od[0] * (f - 0.02), M[1] + od[1] * (f - 0.02)], sx = -od[1], sz = od[0], r = op.w / 2;
        const fl = op.floor, sp = op.arch ? fl + op.h - r : fl + op.h;
        const q = (u, y) => [F[0] + sx * u, y, F[1] + sz * u];
        const nrm = [od[0], 0, od[1]];
        S.quad(q(-r, fl), q(r, fl), q(r, sp), q(-r, sp), STONE_DARK, nrm);
        if (op.arch) for (let k = 0; k < 8; k++) {
          const t0 = Math.PI - (Math.PI * k) / 8, t1 = Math.PI - (Math.PI * (k + 1)) / 8;
          S.tri(q(0, sp), q(r * Math.cos(t0), sp + r * Math.sin(t0)), q(r * Math.cos(t1), sp + r * Math.sin(t1)), STONE_DARK, nrm);
        }
      }
    }
  }
  S.kind = keep;
  return tunnels;
}

function gate(S, g, centre, eaves = null, coverAt = null) {
  // which footprint axis runs through the wall: see gateAxis
  const { cx, cz, w, d, a, pa, px, pz, plen, pwid } = gateAxis(g, centre);
  if (g.k === 'citadel') {
    const top = LAND_Y + WALL_H + 1.4;
    S.kind = KIND.MASONRY;
    // the gate block with its arched passage driven right through it
    // The block reaches to both faces of the rampart, a hand's breadth proud of them, so the passage runs the whole
    // thickness of the wall; city.js cuts the matching slot out of the rampart.
    const reach = [plen / 2 + 0.5, plen / 2 + 0.5];
    for (const [fa, fb] of (coverAt ? coverAt(cx, cz) : [])) {
      const ex = fb[0] - fa[0], ez = fb[1] - fa[1], den = px * ez - pz * ex;
      if (Math.abs(den) < 1e-6) continue;
      const qx = fa[0] - cx, qz = fa[1] - cz, t = (qx * ez - qz * ex) / den, s = (qx * pz - qz * px) / den;
      if (s < 0 || s > 1 || Math.abs(t) < plen / 2 - 1.5 || Math.abs(t) > plen / 2 + 6) continue;
      const k = t < 0 ? 0 : 1;
      reach[k] = Math.max(reach[k], Math.abs(t) + 0.12);
    }
    const shift = (reach[1] - reach[0]) / 2;
    const ring = rect(cx + px * shift, cz + pz * shift, reach[0] + reach[1], pwid + 1, pa);
    S.prism(ring, top, top, PAL.brickLight, PAL.stone, { topKind: KIND.ROAD });
    const built = passages(S, ring, LAND_Y - 0.5, top, PAL.brickLight, [{ p: [cx, cz], dir: [px, pz], w: CITADEL_PASSAGE.w, h: CITADEL_PASSAGE.h, floor: LAND_Y, arch: true }]);
    S.kind = KIND.MASONRY;
    S.box(cx, cz, top, top + 0.8, w + 0.6, d + 0.6, a, shade(PAL.brickLight, 1.08), { top: PAL.stone, topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    if (!built.length) for (const s of [-1, 1]) {
      const fx = cx + px * s * (plen / 2 + 0.42), fz = cz + pz * s * (plen / 2 + 0.42);
      S.box(fx, fz, LAND_Y, LAND_Y + 4.4, 0.3, 4.2, pa, dark);
      S.box(fx, fz, LAND_Y + 4.4, LAND_Y + 5.3, 0.3, 3.0, pa, dark);
    }
    // the gate's flat top is walled with a crenellated brick parapet (lỗ châu mai), the watch pavilion inside it
    {
      const W2 = w + 0.6, D2 = d + 0.6, ux = Math.cos(a), uz = Math.sin(a);
      const Pq = (u, v) => [cx + u * ux - v * uz, cz + u * uz + v * ux];
      S.kind = KIND.MASONRY;
      for (const [len, along, off] of [[W2, true, D2 / 2], [W2, true, -D2 / 2], [D2, false, W2 / 2], [D2, false, -W2 / 2]]) {
        const n = Math.max(3, Math.round(len / 1.4));
        for (let k = 0; k < n; k++) {
          const s = -len / 2 + (len * (k + 0.5)) / n;
          const q = along ? Pq(s, off - Math.sign(off) * 0.25) : Pq(off - Math.sign(off) * 0.25, s);
          const merlon = k % 2 === 0;
          S.box(q[0], q[1], top + 0.8, top + 0.8 + (merlon ? 1.15 : 0.7), along ? len / n : 0.5, along ? 0.5 : len / n, a, shade(PAL.brickLight, 1.08), { top: PAL.stone });
        }
      }
      // the name panel (carved characters on a framed stone tablet) over the arch, on each face
      S.kind = KIND.PLAIN;
      for (const k of [0, 1]) {
        const sg = k ? 1 : -1, dd = reach[k] + 0.08; // the block's faces stand reach[] out from the gate's centre
        const yb = LAND_Y + CITADEL_PASSAGE.h + 0.75;
        S.box(cx + px * sg * dd, cz + pz * sg * dd, yb, yb + 1.25, 3.6, 0.16, pa + Math.PI / 2, hex('#ddd3bd'));
        S.box(cx + px * sg * (dd + 0.06), cz + pz * sg * (dd + 0.06), yb + 0.18, yb + 1.07, 3.1, 0.08, pa + Math.PI / 2, hex('#3b3430'));
      }
    }
    pavilion(S, cx, cz, Math.min(pwid * 0.74, 12), Math.min(plen * 0.6, 8), pa + Math.PI / 2, top + 0.8, { tiers: 2, wallH: 3.0, roof: hex('#c08a2e'), over: 1.3, rh: 2.6, ridge: hex('#e0c270'), eaves, colonnade: true });
  } else {
    if (replaced('chuongduc') && String(g.n || '').normalize('NFC') === 'Chương Đức'.normalize('NFC')) return { cx, cz, px, pz, plen }; // drawn by places/chuongduc.js
    // Imperial City gates: lower, brightly tiled, three bays. The same form serves the gates of chùa Thiên Mụ, which
    // stand up on Hà Khê hill, so they take the height of their own ground.
    const G = LAND_Y + rise(cx, cz);
    S.base = G - LAND_Y;
    const top = G + 5.2;
    S.kind = KIND.MASONRY;
    // three arched passages through the block, the middle one taller
    const ring = rect(cx, cz, w, Math.max(d, 4), a), wallC = hex('#d9c9a4');
    S.prism(ring, top, top, wallC, PAL.stone, { topKind: KIND.ROAD });
    const ops = [-1, 0, 1].map((o) => ({ p: [cx - pz * o * pwid * 0.28, cz + px * o * pwid * 0.28], dir: [px, pz], w: o === 0 ? 2.6 : 2.0, h: o === 0 ? 4.0 : 3.2, floor: G, arch: true }));
    const built = passages(S, ring, G - 0.6, top, wallC, ops); // the Imperial City's wall stops at this footprint (city.js)
    S.kind = KIND.PLAIN;
    for (const s of [-1, 1]) for (const o of [-1, 0, 1]) {
      if (built.some((t) => t.op === ops[o + 1])) continue;
      const fx = cx + px * s * (plen / 2 + 0.1) - pz * o * pwid * 0.28, fz = cz + pz * s * (plen / 2 + 0.1) + px * o * pwid * 0.28;
      S.box(fx, fz, G, G + (o === 0 ? 3.8 : 3.0), 0.3, o === 0 ? 2.6 : 2.0, pa, dark);
    }
    // Hiển Nhơn and Chương Đức, the Imperial City's east and west gates, carry their two-storey tower under yellow
    // glazed tiles (hoàng lưu ly), the emperor's; the unnamed gates (at Thiên Mụ) and Trấn Bình keep the green
    const nm = String(g.n || '').normalize('NFC');
    const yellow = ['Cửa Hiển Nhơn', 'Chương Đức'].map((n) => n.normalize('NFC')).includes(nm);
    pavilion(S, cx, cz, Math.min(pwid * 0.8, 14), Math.max(3.5, plen * 0.7), pa + Math.PI / 2, top, { tiers: 2, wallH: 2.2, roof: yellow ? PAL.imperialRoof : PAL.jadeRoof, wall: hex('#b9452e'), over: 1.1, rh: 2.2, eaves, ridge: yellow ? RIDGE : hex('#e8d9a0') });
    // a white parapet round the gate's flat top, with the tower standing inside it
    S.kind = KIND.PLAIN;
    const pr = rect(cx, cz, w - 0.3, Math.max(d, 4) - 0.3, a), pi = rect(cx, cz, w - 0.9, Math.max(d, 4) - 0.9, a);
    S.prism(pr, top, top + 0.75, hex('#e6dcc3'), hex('#efe6d0'), { holes: [pi.reverse()], top: true });
    S.base = 0;
  }
  return { cx, cz, px, pz, plen };
}

// A dataset that lacks what the Citadel needs leaves it out (and the shared buffer as it was) instead of stopping the
// whole load; main.js still gets the object it calls every frame.
export function buildCitadel(data, S, group) {
  const n0 = S.n;
  try { return citadel(data, S, group); } catch (e) {
    S.n = n0; S.kind = KIND.PLAIN; S.base = 0;
    console.warn('Citadel not built:', e);
    return { flag: null, glows: [], update() {} };
  }
}
function citadel(data, S, group) {
  const place = (id) => { const p = (data.places || []).find((q) => q.id === id); return p ? [p.x / 10, p.z / 10] : null; };
  const impCentre = [data.imperial.c[0] / 10, data.imperial.c[1] / 10];
  const cityCentre = place('kinhthanh') || impCentre; // the Imperial City stands near enough the middle to aim the gates by

  // night lighting: A = Kỳ Đài and Ngọ Môn, B = the halls, riverside pavilions and the two south gates (both electric);
  // lanterns at doorways, floodlights at the flagpole's foot
  const LA = new Buf(800), LB = new Buf(800);
  const lanPos = [], lanCol = [], floodPos = [], floodCol = [], glows = [];
  const lantern = (x, y, z) => { lanPos.push(x, y, z); lanCol.push(...LANTERN); };
  const LIT_GATES = ['Cửa Ngăn', 'Cửa Thượng Tứ'].map((n) => n.normalize('NFC'));

  // faces of the rampart and of the Imperial City's wall (drawn in city.js), which may stand across a passage's mouth
  const coverFaces = [];
  for (const poly of data.wall || []) for (const r of poly.map(unflat)) for (let i = 0; i < r.length; i++) coverFaces.push([r[i], r[(i + 1) % r.length]]);
  for (const flat of data.iwalls || []) {
    const pts = unflat(flat);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.3) continue;
      const tx = (b[0] - a[0]) / len, tz = (b[1] - a[1]) / len;
      for (const o of [-0.85, 0.85]) coverFaces.push([[a[0] - tx * 0.75 - tz * o, a[1] - tz * 0.75 + tx * o], [b[0] + tx * 0.75 - tz * o, b[1] + tz * 0.75 + tx * o]]);
    }
  }
  const coverAt = (x, z, R = 45) => coverFaces.filter(([a, b]) => {
    const ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
    return Math.hypot(a[0] + ex * t - x, a[1] + ez * t - z) < R;
  });

  for (const g of data.gates || []) {
    if (String(g.n || '').normalize('NFC') === 'Cửa Hiển Nhơn'.normalize('NFC') && replaced('hiennhon')) continue; // drawn by places/hiennhon.js
    if (replaced('mangca') && String(g.n || '').normalize('NFC') === 'Trấn Bình Môn'.normalize('NFC')) continue; // drawn by places/mangca.js
    if (replaced('gate:' + String(g.n || ''))) continue; // any 'gate:<name>' replica (places/gate-cua-*.js) draws that gate itself
    if (replaced('thienmu') && data.hakhe && inRing(g.c[0] / 10, g.c[1] / 10, unflat(data.hakhe.ring))) continue; // Thiên Mụ's side gates: places/thienmu.js
    const lit =LIT_GATES.includes(String(g.n || '').normalize('NFC'));
    const eaves = lit ? [] : null;
    const gi = gate(S, g, g.k === 'citadel' ? cityCentre : impCentre, eaves, coverAt);
    if (!lit) continue;
    // the watch pavilion's lower eave, all round, and a lamp in the passage on each face
    if (eaves[0]) eaveStrip(LB, eaves[0]);
    for (const s of [-1, 1]) lantern(gi.cx + gi.px * s * (gi.plen / 2 + 1.2), LAND_Y + 2.6, gi.cz + gi.pz * s * (gi.plen / 2 + 1.2));
  }

  // ---- Kỳ Đài: three brick terraces on the Nam Chánh bastion, and the flag ----
  let flag = null;
  if (data.special?.kydai && !replaced('kydai')) { // drawn by places/kydai.js
    const ring = unflat(data.special?.kydai.ring);
    const c = ringCentre(ring);
    const scale = (k) => ring.map((p) => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
    let y = LAND_Y;
    const tiers = [[1.0, 5.6], [0.74, 5.8], [0.5, 6.2]]; // 17.6 m of terraces
    S.kind = KIND.MASONRY;
    for (const [k, h] of tiers) {
      S.prism(scale(k), y, y + h, PAL.brick, PAL.stone, { scaleTop: 0.94, centre: c, topKind: KIND.ROAD });
      S.prism(scale(k * 0.94), y + h, y + h + 0.9, shade(PAL.brickLight, 1.05), PAL.stone, { holes: [scale(k * 0.9).reverse()], centre: c, top: true, topKind: KIND.ROAD });
      ringStrip(LA, scale(k * 0.94), y + h + 0.9 - 0.16, 0.1, 0.18, 0.28); // along the parapet's outer top edge
      y += h;
    }
    // a ring of floodlights at the foot of the pole, so pole and flag read against the night sky
    for (let i = 0; i < 7; i++) {
      const t = (i / 7) * Math.PI * 2;
      floodPos.push(c[0] + Math.cos(t) * 2.2, y + 0.35, c[1] + Math.sin(t) * 2.2);
      floodCol.push(1.0, 0.76, 0.42);
    }
    S.kind = KIND.PLAIN;
    const poleH = 37;
    S.cyl(c[0], c[1], y, y + 3, 1.3, 1.0, 8, PAL.stone);
    S.cyl(c[0], c[1], y + 3, y + poleH, 0.5, 0.28, 8, hex('#e2dccd'));
    flag = makeFlag(group, { at: [c[0], y + poleH - 0.4, c[1]], w: 15, h: 10, look: 'vn' }); // waves down-wind (anim.js)
  }

  // ---- Ngọ Môn: U-shaped masonry base from OSM, Lầu Ngũ Phụng on top ----
  if (data.special?.ngomon && !replaced('ngomon')) {
    const ring = unflat(data.special?.ngomon.ring);
    const o = obb(ring);
    const baseTop = LAND_Y + 5.4;
    S.kind = KIND.MASONRY;
    S.prism(ring, baseTop, baseTop, hex('#8e8172'), PAL.stone, { topKind: KIND.ROAD, parapet: 0.7 }); // top and parapet; walls below
    S.kind = KIND.PLAIN;
    ringStrip(LA, ring, baseTop + 0.7 - 0.16, 0.12, 0.18, 0.28); // the top of the base, on its outer faces
    const eaves = []; // Lầu Ngũ Phụng's roofs, washed from under every eave
    const ux = Math.cos(o.a), uz = Math.sin(o.a);
    let vx = -uz, vz = ux; // short axis, pointed out of the Imperial City (the arms of the U reach this way)
    if ((o.c[0] - impCentre[0]) * vx + (o.c[1] - impCentre[1]) * vz < 0) { vx = -vx; vz = -vz; }
    const P = (u, v) => [o.c[0] + ux * u + vx * v, o.c[1] + uz * u + vz * v];
    const back = -o.d * 0.2;
    // centre hall: yellow glazed tiles (the emperor's), two tiers
    let p = P(0, back);
    pavilion(S, p[0], p[1], o.w * 0.4, o.d * 0.4, o.a, baseTop, { tiers: 2, wallH: 3.1, roof: PAL.imperialRoof, over: 1.5, rh: 3.1, eaves, colonnade: true, segs: 3 }); // under 15 m in all
    // flanking galleries and the two wing pavilions: green tiles
    for (const s of [-1, 1]) {
      p = P(s * o.w * 0.3, back);
      pavilion(S, p[0], p[1], o.w * 0.2, o.d * 0.3, o.a, baseTop, { tiers: 1, wallH: 3.0, roof: PAL.jadeRoof, over: 1.1, rh: 2.4, eaves, colonnade: true, segs: 3 });
      p = P(s * o.w * 0.405, o.d * 0.08);
      pavilion(S, p[0], p[1], o.d * 0.66, o.w * 0.15, o.a + Math.PI / 2, baseTop, { tiers: 2, wallH: 3.0, roof: PAL.jadeRoof, over: 1.1, rh: 2.6, eaves, colonnade: true, segs: 3 });
    }
    for (const e of eaves) eaveStrip(LA, e);
    // the three gateways through the base (flat lintels: the emperor's in the middle, the mandarins' either side),
    // and the arched side passage for soldiers, elephants and horses through each wing, from the court outward
    const ops = [-1, 0, 1].map((k) => ({ p: P(k * o.w * 0.11, back), dir: [vx, vz], w: k === 0 ? 3.2 : 2.4, h: k === 0 ? 4.2 : 3.6, floor: LAND_Y, arch: false }));
    ops.push({ p: P(0, o.d * 0.29), dir: [ux, uz], w: 2.3, h: 3.3, floor: LAND_Y, arch: true });
    S.kind = KIND.MASONRY;
    const built = passages(S, ring, LAND_Y, baseTop, hex('#8e8172'), ops);
    S.kind = KIND.PLAIN;
    for (const k of [-1, 0, 1]) {
      const tn = built.find((t) => t.op === ops[k + 1]); // a lamp in the court, just outside each gateway
      const l = tn ? P(k * o.w * 0.11, back + Math.max(tn.A.t, tn.B.t) + 5.0) : P(k * o.w * 0.11, back + o.d * 0.2 + 1.0);
      lantern(l[0], LAND_Y + (k === 0 ? 2.5 : 2.2), l[1]);
      if (!built.some((t) => t.op === ops[k + 1])) {
        const q = P(k * o.w * 0.11, back + o.d * 0.2 + 0.2);
        S.box(q[0], q[1], LAND_Y, LAND_Y + (k === 0 ? 4.2 : 3.6), k === 0 ? 3.2 : 2.4, 0.4, o.a, dark);
      }
    }
  }

  // ---- Điện Thái Hòa: twin joined roofs over the throne hall ----
  // Two halls under one plan (trùng thiềm điệp ốc): the front hall (tiền điện) lower and shallower, the main hall
  // behind it taller under a double-eaved roof (a skirt of tiles all round, the upper hip roof above), both in yellow
  // glazed tiles; red lacquered columns round the verandah. Before it, toward Ngọ Môn, the Esplanade of Great
  // Salutations (sân Đại Triều Nghi) falls in two stone terraces with a raised imperial way up the middle.
  if (data.special?.thaihoa && !replaced('thaihoa')) {
    const o = obb(unflat(data.special?.thaihoa.ring));
    const ux = Math.cos(o.a), uz = Math.sin(o.a), vx = -uz, vz = ux;
    const tgt = data.special.ngomon ? obb(unflat(data.special.ngomon.ring)).c : data.special.kydai ? ringCentre(unflat(data.special.kydai.ring)) : null;
    const fs = tgt && (tgt[0] - o.c[0]) * vx + (tgt[1] - o.c[1]) * vz < 0 ? -1 : 1; // which way along v is the front
    const V = (u, v) => [o.c[0] + ux * u + vx * v, o.c[1] + uz * u + vz * v];
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], LAND_Y, LAND_Y + 1.4, o.w + 7, o.d + 7, o.a, PAL.stone, { taper: 0.97, topKind: KIND.ROAD });
    // the esplanade: an upper terrace and a lower one, and the raised way through both
    {
      const e1 = 11, e2 = 13, ew = o.w + 10;
      let q = V(0, fs * (o.d / 2 + 3.5 + e1 / 2));
      S.box(q[0], q[1], LAND_Y - 0.3, LAND_Y + 0.9, ew, e1, o.a, shade(PAL.stone, 0.97), { topKind: KIND.ROAD });
      q = V(0, fs * (o.d / 2 + 3.5 + e1 + e2 / 2));
      S.box(q[0], q[1], LAND_Y - 0.3, LAND_Y + 0.45, ew + 6, e2, o.a, shade(PAL.stone, 0.94), { topKind: KIND.ROAD });
      q = V(0, fs * (o.d / 2 + 3.5 + (e1 + e2) / 2));
      S.box(q[0], q[1], LAND_Y - 0.3, LAND_Y + 1.0, 4.2, e1 + e2, o.a, shade(PAL.stone, 1.06), { topKind: KIND.ROAD });
      // the rank stones (phẩm sơn) of the mandarins, in two rows either side of the way on each terrace
      S.kind = KIND.PLAIN;
      for (const [vv, yy] of [[o.d / 2 + 3.5 + e1 / 2, LAND_Y + 0.9], [o.d / 2 + 3.5 + e1 + e2 / 2, LAND_Y + 0.45]]) for (const sd of [-1, 1]) for (let k = 0; k < 9; k++) {
        const r = V(sd * (5 + k * 2.4), fs * vv);
        S.box(r[0], r[1], yy, yy + 0.75, 0.45, 0.22, o.a, hex('#c9c1ae'));
      }
    }
    S.kind = KIND.PLAIN;
    const halls = [
      { off: fs * 0.27, dep: 0.42, opt: { tiers: 1, wallH: 3.4, rh: 3.0, over: 1.5 } }, // front hall
      { off: -fs * 0.2, dep: 0.56, opt: { tiers: 2, wallH: 3.6, rh: 3.2, over: 1.7 } }, // main hall, double eaves: 11.8 m to the ridge (docs/heights-reference.json)
    ];
    for (const { off, dep, opt } of halls) {
      const eaves = [];
      pavilion(S, o.c[0] + vx * o.d * off, o.c[1] + vz * o.d * off, o.w, o.d * dep, o.a, LAND_Y + 1.4, { ...opt, roof: PAL.imperialRoof, eaves, colonnade: true, segs: 3 });
      // only the outer long side of each lower roof: the inner ones meet in the valley between them
      if (eaves[0]) eaveStrip(LB, eaves[0], [off < 0 ? 'v-' : 'v+'], 0.12, 0.09);
      if (eaves[1]) eaveStrip(LB, eaves[1], ['v-', 'v+'], 0.12, 0.09);
    }
    // two lamps before the doors, on the side that faces Ngọ Môn (or Kỳ Đài)
    if (tgt) for (const k of [-1, 1]) {
      const v = fs * (o.d * 0.5 + 0.9), u = k * o.w * 0.14;
      lantern(o.c[0] + ux * u + vx * v, LAND_Y + 1.4 + 1.7, o.c[1] + uz * u + vz * v);
    }
  }

  // ---- riverside pavilions in front of the Citadel ----
  for (const key of ['phuvanlau', 'nghenhluong']) {
    if (!data.special?.[key]) continue;
    if (replaced(key)) continue;
    const o = obb(unflat(data.special?.[key].ring));
    if (key === 'phuvanlau') {
      const eaves = [];
      pavilion(S, o.c[0], o.c[1], o.w * 0.86, o.d * 0.86, o.a, LAND_Y, { tiers: 2, wallH: 3.9, roof: PAL.imperialRoof2, wall: hex('#8f3b2a'), over: 1.2, rh: 3.1, platform: 1.2, eaves, colonnade: true, segs: 3 }); // 11.8 m with its 1.2 m platform
      if (eaves[0]) eaveStrip(LB, eaves[0], ['v-', 'v+'], 0.12, 0.09);
      // two lamps on the river face (away from Kỳ Đài)
      if (data.special?.kydai) {
        const kd = ringCentre(unflat(data.special?.kydai.ring));
        const fc = faceToward({ ...o, w: o.w * 0.86, d: o.d * 0.86 }, [o.c[0] - kd[0], o.c[1] - kd[1]]);
        for (const k of [-1, 1]) {
          const a = fc.half + 0.9, b = k * Math.min(1.6, fc.side * 0.4);
          lantern(o.c[0] + fc.n[0] * a + fc.t[0] * b, LAND_Y + 1.2 + 1.6, o.c[1] + fc.n[1] * a + fc.t[1] * b);
        }
      }
      continue;
    }
    // Nghênh Lương Đình: a square pavilion with a lower "crab-shell" porch before and behind, on a 0.9 m base,
    // and steps down to a landing at the water (the axis runs from Kỳ Đài out to the river)
    const kd = data.special?.kydai ? ringCentre(unflat(data.special?.kydai.ring)) : [o.c[0] - 1, o.c[1] - 1];
    let f = [o.c[0] - kd[0], o.c[1] - kd[1]];
    { const l = Math.hypot(f[0], f[1]) || 1; f = [f[0] / l, f[1] / l]; }
    const fa = Math.atan2(f[1], f[0]), side = Math.min(o.w, o.d) * 0.72, at = (a) => [o.c[0] + f[0] * a, o.c[1] + f[1] * a];
    const wall = hex('#8f3b2a'), roof = PAL.imperialRoof2;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], LAND_Y, LAND_Y + 0.9, side + 9.5, side + 3.2, fa, PAL.stone, { taper: 0.98, topKind: KIND.ROAD });
    for (const sd of [-1, 1]) {
      const q = at(sd * (side / 2 + 2.0));
      S.kind = KIND.TIMBER;
      S.box(q[0], q[1], LAND_Y + 0.9, LAND_Y + 3.5, 3.4, side * 0.7, fa, wall, { top: shade(roof, 0.8) });
      S.hip(q[0], q[1], side * 0.7, 3.4, fa + Math.PI / 2, LAND_Y + 3.5, 1.5, roof, { flare: 0.4, over: 1.0, fascia: 0.25, fasciaCol: shade(wall, 0.75), glazed: true });
    }
    const eaves = [];
    // the pavilion itself stands under a two-tiered (chồng diêm) roof of yellow glazed tiles
    pavilion(S, o.c[0], o.c[1], side, side, fa, LAND_Y + 0.9, { tiers: 2, wallH: 2.7, roof, wall, over: 1.3, rh: 2.0, eaves, colonnade: true, segs: 3 }); // 7–8 m (docs/heights-reference.json)
    // the two open sides (the porches cover the front and back), and two lamps at the river porch
    if (eaves[0]) eaveStrip(LB, eaves[0], ['v-', 'v+'], 0.12, 0.09);
    for (const k of [-1, 1]) {
      const q = at(side / 2 + 2.0 + 1.7 + 0.6);
      lantern(q[0] - f[1] * k * 1.3, LAND_Y + 0.9 + 1.6, q[1] + f[0] * k * 1.3);
    }
    S.kind = KIND.MASONRY;
    // the flight goes down the embankment face: its first step below the bank (the fifth) stands at the mapped shore,
    // and a paved walk at the base's level runs out to it where the shore lies farther off (on a fixed run the lower
    // steps and the landing were sunk in the bank)
    const land = landTest(data);
    let s0 = side / 2 + 5.2;
    for (let a = s0 + 5 * 0.42; a < s0 + 40; a += 0.25) { const q = at(a); if (!land(q[0], q[1])) { s0 = a - 5 * 0.42; break; } }
    if (s0 > side / 2 + 5.3) { const q = at((side / 2 + 4.7 + s0) / 2); S.box(q[0], q[1], LAND_Y - 0.4, LAND_Y + 0.86, s0 - side / 2 - 4.7, 6, fa, PAL.stone, { topKind: KIND.ROAD }); }
    for (let i = 0; i < 13; i++) { const q = at(s0 + i * 0.42); S.box(q[0], q[1], LAND_Y - 2.4, LAND_Y + 0.86 - i * 0.2, 0.44, 6, fa, PAL.stone, { topKind: KIND.ROAD }); }
    { const q = at(s0 + 13 * 0.42 + 2.2); S.box(q[0], q[1], LAND_Y - 3.2, LAND_Y - 1.75, 4.6, 16, fa, PAL.stone, { topKind: KIND.ROAD }); }
    S.kind = KIND.PLAIN;
  }

  lightMesh(group, LA, 0xffb64c, 1.4);
  lightMesh(group, LB, 0xffae42, 1.2);
  lampPoints(group, lanPos, lanCol, 7, glows);
  lampPoints(group, floodPos, floodCol, 8, glows);

  return {
    flag,
    glows,
    update() {}, // the flag moves on the shared clock (anim.js)
  };
}
