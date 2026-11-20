import * as THREE from 'three';
import { Buf, KIND, hex, shade, unflat, obb, ringCentre, signedArea, inRing } from '../geo/buf.js';
import { gateAxis, CITADEL_PASSAGE } from '../geo/gates.js';
import { LAND_Y, WALL_H, PAL } from '../config.js';
import { rise } from '../geo/terrain.js';
import { shared, lightMaterial, glowPoints } from '../geo/materials.js';

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
function lightMesh(group, L, color, boost, minEra) {
  if (!group || !L || L.n === 0) return null;
  const m = new THREE.Mesh(L.geometry(), lightMaterial(color, boost));
  m.renderOrder = 19;
  m.userData.minEra = minEra;
  group.add(m);
  return m;
}
function lampPoints(group, pos, col, size, minEra, glows) {
  if (!group || !pos.length) return null;
  const p = glowPoints(pos, col, size);
  p.userData.glow = true;
  p.userData.minEra = minEra;
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
    pavilion(S, cx, cz, Math.min(pwid * 0.74, 12), Math.min(plen * 0.6, 8), pa + Math.PI / 2, top + 0.8, { tiers: 2, wallH: 3.0, roof: hex('#c08a2e'), over: 1.3, rh: 2.6, ridge: hex('#e0c270'), eaves, colonnade: true });
  } else {
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
    pavilion(S, cx, cz, Math.min(pwid * 0.8, 14), Math.max(3.5, plen * 0.7), pa + Math.PI / 2, top, { tiers: 2, wallH: 2.2, roof: PAL.jadeRoof, wall: hex('#b9452e'), over: 1.1, rh: 2.2, eaves });
    S.base = 0;
  }
  return { cx, cz, px, pz, plen };
}

// Flag for Kỳ Đài: red field, yellow star, moved by a small vertex wave.
function makeFlag() {
  const cv = document.createElement('canvas');
  cv.width = 192; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#d5231d'; g.fillRect(0, 0, 192, 128);
  g.fillStyle = '#ffdf2e';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 15 : 38, t = -Math.PI / 2 + (i * Math.PI) / 5;
    g[i ? 'lineTo' : 'moveTo'](96 + Math.cos(t) * r, 66 + Math.sin(t) * r);
  }
  g.closePath(); g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1, 1, 14, 6);
  geo.translate(0.5, 0, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uTime: { value: 0 }, uLight: { value: 1 }, uEra: shared.uEra },
    side: THREE.DoubleSide,
    vertexShader: `uniform float uTime; varying vec2 vUv; varying float vSh;
      void main() { vUv = uv; vec3 p = position;
        float w = sin( p.x * 7.0 - uTime * 4.2 ) * 0.07 * p.x + sin( p.x * 3.0 - uTime * 2.6 + p.y * 2.0 ) * 0.05 * p.x;
        p.z += w; p.y -= p.x * p.x * 0.05; vSh = 0.86 + w * 2.4;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 ); }`,
    // the standard flown here in each era: the imperial yellow; from the 1920s yellow with a red band; today's flag
    fragmentShader: `uniform sampler2D map; uniform float uLight, uEra; varying vec2 vUv; varying float vSh;
      void main() { vec4 c = texture2D( map, vUv );
        if ( uEra < 0.5 ) c.rgb = vec3( 0.93, 0.76, 0.16 );
        else if ( uEra < 1.5 ) c.rgb = abs( vUv.y - 0.5 ) < 0.17 ? vec3( 0.78, 0.13, 0.1 ) : vec3( 0.93, 0.76, 0.16 );
        gl_FragColor = vec4( c.rgb * vSh * uLight, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
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

  // night lighting: A = Kỳ Đài and Ngọ Môn, B = the halls, riverside pavilions and the two south gates (both electric,
  // today only); lanterns at doorways in every era, floodlights at the flagpole's foot today only
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
    const lit = LIT_GATES.includes(String(g.n || '').normalize('NFC'));
    const eaves = lit ? [] : null;
    const gi = gate(S, g, g.k === 'citadel' ? cityCentre : impCentre, eaves, coverAt);
    if (!lit) continue;
    // the watch pavilion's lower eave, all round, and a lamp in the passage on each face
    if (eaves[0]) eaveStrip(LB, eaves[0]);
    for (const s of [-1, 1]) lantern(gi.cx + gi.px * s * (gi.plen / 2 + 1.2), LAND_Y + 2.6, gi.cz + gi.pz * s * (gi.plen / 2 + 1.2));
  }

  // ---- Kỳ Đài: three brick terraces on the Nam Chánh bastion, and the flag ----
  let flag = null;
  if (data.special?.kydai) {
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
    flag = makeFlag();
    flag.scale.set(15, 10, 1);
    flag.position.set(c[0], y + poleH - 5.4, c[1]);
    flag.rotation.y = -0.55; // streaming down-wind, toward the river mouth
    group.add(flag);
  }

  // ---- Ngọ Môn: U-shaped masonry base from OSM, Lầu Ngũ Phụng on top ----
  if (data.special?.ngomon) {
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
  if (data.special?.thaihoa) {
    const o = obb(unflat(data.special?.thaihoa.ring));
    const ux = Math.cos(o.a), uz = Math.sin(o.a), vx = -uz, vz = ux;
    S.kind = KIND.MASONRY;
    S.box(o.c[0], o.c[1], LAND_Y, LAND_Y + 1.4, o.w + 7, o.d + 7, o.a, PAL.stone, { taper: 0.97, topKind: KIND.ROAD });
    S.kind = KIND.PLAIN;
    for (const [off, dep] of [[-0.24, 0.5], [0.25, 0.46]]) {
      const eaves = [];
      pavilion(S, o.c[0] + vx * o.d * off, o.c[1] + vz * o.d * off, o.w, o.d * dep, o.a, LAND_Y + 1.4, { tiers: 1, wallH: 4.6, roof: PAL.imperialRoof, over: 1.6, rh: 4.6, eaves, colonnade: true, segs: 3 });
      // only the outer long side of each roof: the inner ones meet in the valley between them
      if (eaves[0]) eaveStrip(LB, eaves[0], [off < 0 ? 'v-' : 'v+'], 0.12, 0.09);
    }
    // two lamps before the doors, on the side that faces Ngọ Môn (or Kỳ Đài)
    const tgt = data.special?.ngomon ? obb(unflat(data.special?.ngomon.ring)).c : data.special?.kydai ? ringCentre(unflat(data.special?.kydai.ring)) : null;
    if (tgt) {
      const s = (tgt[0] - o.c[0]) * vx + (tgt[1] - o.c[1]) * vz < 0 ? -1 : 1;
      for (const k of [-1, 1]) {
        const v = s * (o.d * 0.5 + 0.9), u = k * o.w * 0.14;
        lantern(o.c[0] + ux * u + vx * v, LAND_Y + 1.4 + 1.7, o.c[1] + uz * u + vz * v);
      }
    }
  }

  // ---- riverside pavilions in front of the Citadel ----
  for (const key of ['phuvanlau', 'nghenhluong']) {
    if (!data.special?.[key]) continue;
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
    pavilion(S, o.c[0], o.c[1], side, side, fa, LAND_Y + 0.9, { tiers: 1, wallH: 3.6, roof, wall, over: 1.3, rh: 3.0, eaves });
    // the two open sides (the porches cover the front and back), and two lamps at the river porch
    if (eaves[0]) eaveStrip(LB, eaves[0], ['v-', 'v+'], 0.12, 0.09);
    for (const k of [-1, 1]) {
      const q = at(side / 2 + 2.0 + 1.7 + 0.6);
      lantern(q[0] - f[1] * k * 1.3, LAND_Y + 0.9 + 1.6, q[1] + f[0] * k * 1.3);
    }
    S.kind = KIND.MASONRY;
    for (let i = 0; i < 13; i++) { const q = at(side / 2 + 5.2 + i * 0.42); S.box(q[0], q[1], LAND_Y - 2.4, LAND_Y + 0.86 - i * 0.2, 0.44, 6, fa, PAL.stone, { topKind: KIND.ROAD }); }
    { const q = at(side / 2 + 5.2 + 13 * 0.42 + 2.2); S.box(q[0], q[1], LAND_Y - 3.2, LAND_Y - 1.75, 4.6, 16, fa, PAL.stone, { topKind: KIND.ROAD }); }
    S.kind = KIND.PLAIN;
  }

  lightMesh(group, LA, 0xffb64c, 1.4, 2);
  lightMesh(group, LB, 0xffae42, 1.2, 2);
  lampPoints(group, lanPos, lanCol, 7, 0, glows);
  lampPoints(group, floodPos, floodCol, 8, 2, glows);

  return {
    flag,
    glows,
    update(time, light) {
      if (flag) { flag.material.uniforms.uTime.value = time; flag.material.uniforms.uLight.value = light; }
    },
  };
}

// ---- Chùa Thiên Mụ on Hà Khê hill ----
// Tháp Phước Duyên: seven octagonal storeys narrowing upward, 21 m (height from its OSM tag), on the mapped
// octagon. In front, toward the river: the four entrance pillars and the steps down the slope. Around it: the
// small stele and bell pavilions and the triple gate, each on its own OSM footprint.
export function buildThienMu(data, S, group = null) {
  const glows = [];
  if (!data.special || !data.special.phuocduyen) return { glows };
  const LT = group ? new Buf(800) : null; // rings of light under the seven eaves (today only)
  const lanPos = [], lanCol = [];
  const ring = unflat(data.special.phuocduyen.ring);
  const c = ringCentre(ring);
  const rOsm = ring.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1]), 0) / ring.length;
  const small = (data.special.thienmuSmall || []).map(unflat);
  // the compound's axis: from the triple gate (the widest small building, behind the tower) out to the river
  let f = [0.23, 0.97];
  const gateRing = small.map((rg) => [obb(rg).w, rg]).sort((a, b) => b[0] - a[0]).map((e) => e[1])[0]; // widths worked out once, not in the comparator
  if (gateRing) { const g = ringCentre(gateRing); const l = Math.hypot(c[0] - g[0], c[1] - g[1]) || 1; f = [(c[0] - g[0]) / l, (c[1] - g[1]) / l]; }
  const p = [-f[1], f[0]];
  const fa = Math.atan2(f[1], f[0]);
  const brick = hex('#b8897a'), eave = hex('#5b5352'), trim = hex('#e9dfcd'), dark = hex('#2b2422'), stone = PAL.stone;
  // Hà Khê hill: the pagoda's walled ground is one level (data.hakhe, from the elevation model). The terrain grid
  // rounds the hill's brow off, so the compound stands on a stone-faced terrace at that level, and everything in it
  // is founded on the terrace.
  const hk = data.hakhe ? { ring: unflat(data.hakhe.ring), y: LAND_Y + data.hakhe.top / 10 + 0.06 } : null;
  const onHill = (x, z) => !!hk && inRing(x, z, hk.ring);
  const gy = (x, z) => { const g = LAND_Y + rise(x, z); return onHill(x, z) ? Math.max(g, hk.y) : g; };
  if (hk) {
    const n0 = S.n;
    S.kind = KIND.MASONRY; S.base = hk.y - LAND_Y;
    S.prism(hk.ring, LAND_Y - 0.6, hk.y, shade(stone, 0.9), hex(PAL.green.sacred || PAL.green.grass), { topKind: KIND.GROUND });
    S.base = 0;
    (S.noCover = S.noCover || []).push([n0, S.n]); // it is ground: trees and the pagoda's own halls stand on it
  }

  // terrace under the tower
  const y0 = gy(c[0], c[1]);
  S.base = y0 - LAND_Y; // everything here is founded on the hill, so the shader's foot darkening starts at its own ground
  S.kind = KIND.MASONRY;
  S.cyl(c[0], c[1], y0 - 1.5, y0 + 0.7, rOsm * 1.75, rOsm * 1.65, 8, stone, { rot: fa - Math.PI / 8 });
  // the tower
  const r = rOsm * 0.76, tiers = 7, total = 21 - 0.7 - 2.6;
  const hs = Array.from({ length: tiers }, (_, i) => 1.22 - i * 0.07), sum = hs.reduce((a, v) => a + v, 0);
  let y = y0 + 0.7;
  for (let i = 0; i < tiers; i++) {
    const h = (total * hs[i]) / sum;
    const ri = r * (1 - 0.068 * i), rn = r * (1 - 0.068 * (i + 1));
    const rot = fa - Math.PI / 8;
    S.kind = KIND.MASONRY;
    S.cyl(c[0], c[1], y, y + h - 0.42, ri, ri * 0.985, 8, brick, { cap: false, rot });
    S.kind = KIND.PLAIN;
    S.cyl(c[0], c[1], y, y + 0.22, ri * 1.05, ri * 1.05, 8, trim, { cap: false, rot });
    S.cyl(c[0], c[1], y + h - 0.7, y + h - 0.42, ri * 1.04, ri * 1.04, 8, trim, { cap: false, rot });
    // arched doorway on the face that looks down to the river, and its opposite
    const ap = ri * Math.cos(Math.PI / 8);
    for (const s of [1, -1]) {
      const dx = c[0] + f[0] * s * (ap + 0.03), dz = c[1] + f[1] * s * (ap + 0.03);
      S.box(dx, dz, y + 0.25, y + h * 0.56, 0.16, Math.max(0.7, ri * 0.34), fa, dark);
    }
    S.cyl(c[0], c[1], y + h - 0.42, y + h - 0.26, ri * 1.2, ri * 1.2, 8, eave, { rot });
    if (LT) {
      // an octagon of light tucked under the eave slab, between the trim band and the eave's edge
      const ly = y + h - 0.42 - 0.06, lr = ri * 1.13;
      for (let k = 0; k < 8; k++) {
        const a0 = rot + (k / 8) * Math.PI * 2, a1 = rot + ((k + 1) / 8) * Math.PI * 2;
        LT.beam([c[0] + Math.cos(a0) * lr, ly, c[1] + Math.sin(a0) * lr], [c[0] + Math.cos(a1) * lr, ly, c[1] + Math.sin(a1) * lr], 0.12, 0.09, W1);
      }
    }
    S.kind = KIND.TILE;
    S.cyl(c[0], c[1], y + h - 0.26, y + h, ri * 1.2, rn * 1.03, 8, eave, { cap: false, rot });
    y += h;
  }
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], y, y + 0.5, r * 0.5, r * 0.26, 8, eave, { rot: fa - Math.PI / 8 });
  S.cyl(c[0], c[1], y + 0.5, y + 1.3, r * 0.2, r * 0.13, 8, trim);
  S.cyl(c[0], c[1], y + 1.3, y + 2.6, 0.13, 0.03, 6, hex('#d9c27a'));

  // the four entrance pillars at the head of the steps: just inside the brow of the terrace
  let brow = rOsm * 1.75 + 8;
  if (hk) { brow = 0; while (brow < 60 && onHill(c[0] + f[0] * (brow + 0.5), c[1] + f[1] * (brow + 0.5))) brow += 0.5; }
  const front = hk ? Math.max(rOsm * 1.75 + 2, brow - 2.5) : rOsm * 1.75 + 6;
  for (const off of [-7.6, -2.5, 2.5, 7.6]) {
    const x = c[0] + f[0] * front + p[0] * off, z = c[1] + f[1] * front + p[1] * off, py = gy(x, z);
    const tall = Math.abs(off) < 5 ? 7.4 : 6.6;
    S.base = py - LAND_Y;
    S.kind = KIND.MASONRY;
    S.box(x, z, py - 1, py + 0.8, 1.5, 1.5, fa, stone);
    S.box(x, z, py + 0.8, py + tall, 1.0, 1.0, fa, trim, { taper: 0.9 });
    S.kind = KIND.PLAIN;
    S.box(x, z, py + tall, py + tall + 0.35, 1.3, 1.3, fa, eave);
    S.cyl(x, z, py + tall + 0.35, py + tall + 1.1, 0.34, 0.05, 6, trim);
    lanPos.push(x + f[0] * 0.85, py + tall - 0.6, z + f[1] * 0.85); // a lamp on the pillar's river face
    lanCol.push(...LANTERN);
  }
  // the stair from the riverside road up to the pillars: one straight flight from the brow, landing where it meets
  // the bank
  S.kind = KIND.ROAD;
  if (hk) {
    const run = 0.7, fall = 0.36; // a step
    for (let k = 0; k < 80; k++) {
      const d = brow + 0.2 + (k + 0.5) * run, x = c[0] + f[0] * d, z = c[1] + f[1] * d;
      const sy = hk.y - (k + 1) * fall, g = LAND_Y + rise(x, z);
      if (sy < g + 0.1) break;
      S.base = sy - LAND_Y;
      S.box(x, z, Math.min(g, sy) - 1.0, sy, run + 0.02, 13, fa, shade(stone, 1.04));
      // low side walls
      for (const sd of [-1, 1]) S.box(x + p[0] * sd * 6.9, z + p[1] * sd * 6.9, Math.min(g, sy) - 1.0, sy + 0.75, run + 0.02, 0.8, fa, shade(stone, 0.92));
    }
    S.base = 0;
  } else {
    for (let d = front + 2; d < front + 46; d += 2.2) {
      const x = c[0] + f[0] * d, z = c[1] + f[1] * d;
      const sy = gy(x, z);
      if (sy < LAND_Y + 0.25) break;
      S.base = sy - LAND_Y;
      S.box(x, z, sy - 1.2, sy + 0.12, 2.3, 13, fa, shade(stone, 1.04));
    }
  }

  // pavilions and gate on their mapped footprints
  for (const rg of small) {
    const o = obb(rg), cc = ringCentre(rg), py = gy(cc[0], cc[1]);
    const rr = rg.reduce((s2, q) => s2 + Math.hypot(q[0] - cc[0], q[1] - cc[1]), 0) / rg.length;
    S.base = py - LAND_Y;
    if (rg === gateRing) {
      // triple gate: three doorways under a two-tier roof
      pavilion(S, o.c[0], o.c[1], o.w, Math.max(o.d, 4.5), o.a, py, { tiers: 2, wallH: 4.2, roof: PAL.templeRoof, wall: hex('#c9a27a'), over: 1.1, rh: 2.4, platform: 0.5, ridge: hex('#d8c9a0'), colonnade: false, steps: false });
      const ux = Math.cos(o.a), uz = Math.sin(o.a);
      S.kind = KIND.PLAIN;
      for (const s of [1, -1]) for (const k of [-1, 0, 1]) {
        const gx = o.c[0] + ux * k * o.w * 0.3 - uz * s * (Math.max(o.d, 4.5) / 2 + 0.05), gz = o.c[1] + uz * k * o.w * 0.3 + ux * s * (Math.max(o.d, 4.5) / 2 + 0.05);
        S.box(gx, gz, py + 0.5, py + (k === 0 ? 3.6 : 3.0), k === 0 ? 2.2 : 1.6, 0.25, o.a, dark);
      }
    } else if (rg.length >= 6 && o.w / Math.max(0.1, o.d) < 1.3) {
      // hexagonal pavilion (stele / great bell)
      S.kind = KIND.MASONRY;
      S.cyl(cc[0], cc[1], py - 0.6, py + 0.5, rr * 1.35, rr * 1.3, 6, stone);
      S.kind = KIND.TIMBER;
      S.cyl(cc[0], cc[1], py + 0.5, py + 3.4, rr * 0.9, rr * 0.9, 6, PAL.templeWall, { cap: false });
      S.kind = KIND.TILE;
      S.cyl(cc[0], cc[1], py + 3.4, py + 5.4, rr * 1.5, rr * 0.12, 6, PAL.templeRoof, { cap: false });
      S.kind = KIND.PLAIN;
      S.cyl(cc[0], cc[1], py + 5.4, py + 6.1, 0.2, 0.04, 5, hex('#d9c27a'));
    } else {
      pavilion(S, o.c[0], o.c[1], Math.max(o.w, 3), Math.max(o.d, 3), o.a, py, { tiers: 1, wallH: 3.0, roof: PAL.templeRoof, wall: PAL.templeWall, over: 0.8, rh: 1.8, platform: 0.5, ridge: hex('#d8c9a0') });
    }
  }
  S.kind = KIND.PLAIN; S.base = 0;
  if (group) {
    lightMesh(group, LT, 0xffba52, 1.5, 2);
    lampPoints(group, lanPos, lanCol, 6.5, 0, glows);
  }
  return { glows };
}

// ---- Chợ Đông Ba: the mapped main hall with its bell tower ----
export function buildMarket(data, S) {
  if (!data.special?.markethall) return;
  const o = obb(unflat(data.special.markethall.ring));
  // the hall stands about 10 m to its ridge and the three-tier clock tower about twice that (docs/reference/heights.md)
  const y0 = LAND_Y, body = 7.4;
  const wall = PAL.marketWall, roof = PAL.marketRoof;
  S.kind = KIND.FACADE;
  S.box(o.c[0], o.c[1], y0, y0 + body, o.w, o.d, o.a, wall, { top: shade(roof, 0.8) });
  // tiled awning band and a low hip roof
  S.hip(o.c[0], o.c[1], o.w, o.d, o.a, y0 + 3.4, 1.2, roof, { over: 2.2, flare: 0.3 });
  S.hip(o.c[0], o.c[1], o.w, o.d, o.a, y0 + body, 3.4, roof, { over: 1.4, flare: 0.4, fascia: 0.4, fasciaCol: shade(wall, 0.8), ridgeCol: hex('#d9c9a0'), hips: true });
  // bell tower rising through the middle of the hall
  const cx = o.c[0], cz = o.c[1];
  let y = y0 + body + 1.2;
  S.box(cx, cz, y0 + body, y + 3.4, 7.4, 7.4, o.a, wall); y += 3.4;
  S.hip(cx, cz, 7.4, 7.4, o.a, y, 1.4, roof, { over: 1.5, flare: 0.4 }); y += 0.8;
  S.box(cx, cz, y, y + 2.8, 5.4, 5.4, o.a, wall); y += 2.8;
  S.hip(cx, cz, 5.4, 5.4, o.a, y, 1.2, roof, { over: 1.3, flare: 0.4 }); y += 0.7;
  S.box(cx, cz, y, y + 2.2, 3.8, 3.8, o.a, wall); y += 2.2;
  S.hip(cx, cz, 3.8, 3.8, o.a, y, 2.4, roof, { over: 1.0, flare: 0.3 });
  S.kind = KIND.PLAIN;
  S.cyl(cx, cz, y + 2.2, y + 3.6, 0.16, 0.05, 5, hex('#d9c27a'));
}
