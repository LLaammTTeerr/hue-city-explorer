// Courtyard props, shared by the tombs, the Imperial City's courts and the temples: stone statues (mandarins,
// elephants, horses, kỳ lân), bronze vessels (vạc, đỉnh), the bronze crane on its tortoise (hạc đồng), the bronze
// cannon on its carriage (thần công), glazed jars and planters. Low-poly but each read by its silhouette; most are
// repeated, so each stays at a few hundred triangles or less (counts beside each builder).
//
// Every builder writes into the shared static buffer S and takes (S, x, y, z, a, opts): (x, z) the centre of its
// foot on the ground, y the level it stands on (the paving's top, not the ground under it), a the direction it faces
// (local +u, the S.box convention: u = (cos a, sin a), v = (-sin a, cos a)). Sizes are metres; `h` or `s` scales.
// The builder sets S.kind and S.base (the floor, for the shader's foot darkening) and leaves S.kind at PLAIN.
import { KIND, hex, shade } from '../geo/buf.ts';
import { LAND_Y } from '../config.ts';

export const PROP_COL = {
  stone: hex('#a29d92'), // Thanh Hóa blue stone, weathered
  stoneDark: hex('#7f7b72'),
  bronze: hex('#4c4a3a'), // dark green-brown patina
  bronzeLit: hex('#6a6046'),
  iron: hex('#2c2a27'),
  wood: hex('#5a3b2a'),
  mouth: hex('#17150f'),
  glazeBlue: hex('#3e6f8c'), glazeWhite: hex('#dfe4e2'), glazeGreen: hex('#4d7a5a'), glazeBrown: hex('#6b4a2e'),
  leaf: hex('#3c5a2e'), leafDark: hex('#2f4a26'), bark: hex('#4e3b2c'),
};
const C = PROP_COL;

// ---------------------------------------------------------------- local frame and two generic shapes
function local(x, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  const p = (u, v) => [x + u * c - v * s, z + u * s + v * c];
  return {
    a, p,
    p3: (u, y, v) => [x + u * c - v * s, y, z + u * s + v * c],
    dir: (du, dy, dv) => [du * c - dv * s, dy, du * s + dv * c],
    box: (S, u, v, y0, y1, su, sv, col, o?) => { const q = p(u, v); S.box(q[0], q[1], y0, y1, su, sv, a, col, o); },
    boxA: (S, u, v, y0, y1, su, sv, da, col, o?) => { const q = p(u, v); S.box(q[0], q[1], y0, y1, su, sv, a + da, col, o); },
  };
}
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];

// A solid of revolution about any axis: from point `o` along `axis`, profile [[t, r], ...] listed so that the outside
// lies to the right of the walk (up the outside, in over a rim, down an inside). Faces get the outward normal of
// their profile segment, so a hollow vessel's inner wall faces in and up. caps: fan at the first / last ring.
// Triangles: seg * 2 per profile segment (fewer where r = 0), + seg per cap.
export function lathe(S, o, axis, prof, seg, col, { cap0 = true, cap1 = true, rot = 0, cols = null }: Record<string, any> = {}) {
  const d = norm3(axis);
  const ref = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1 = norm3(cross(d, ref)), e2 = cross(d, e1);
  const ring = (t, r, th) => {
    const c = Math.cos(th) * r, s = Math.sin(th) * r;
    return [o[0] + d[0] * t + e1[0] * c + e2[0] * s, o[1] + d[1] * t + e1[1] * c + e2[1] * s, o[2] + d[2] * t + e1[2] * c + e2[2] * s];
  };
  for (let i = 0; i + 1 < prof.length; i++) {
    const [t0, r0] = prof[i], [t1, r1] = prof[i + 1];
    const nt = -(r1 - r0), nr = t1 - t0; // outward normal of the segment in the (t, r) plane
    const cc = cols ? cols[i] || col : col;
    for (let k = 0; k < seg; k++) {
      const a0 = rot + (k / seg) * Math.PI * 2, a1 = rot + ((k + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
      const rx = e1[0] * Math.cos(am) + e2[0] * Math.sin(am), ry = e1[1] * Math.cos(am) + e2[1] * Math.sin(am), rz = e1[2] * Math.cos(am) + e2[2] * Math.sin(am);
      const hint = [d[0] * nt + rx * nr, d[1] * nt + ry * nr, d[2] * nt + rz * nr];
      const A = ring(t0, r0, a0), B = ring(t0, r0, a1), Cc = ring(t1, r1, a1), D = ring(t1, r1, a0);
      if (r0 < 1e-4) S.tri(A, Cc, D, cc, hint);
      else if (r1 < 1e-4) S.tri(A, B, Cc, cc, hint);
      else S.quad(A, B, Cc, D, cc, hint);
    }
  }
  const capAt = (i, sign, cc) => {
    const [t, r] = prof[i];
    if (r < 1e-4) return;
    const c0 = ring(t, 0, 0), h = [d[0] * sign, d[1] * sign, d[2] * sign];
    for (let k = 0; k < seg; k++) S.tri(c0, ring(t, r, rot + (k / seg) * Math.PI * 2), ring(t, r, rot + ((k + 1) / seg) * Math.PI * 2), cc, h);
  };
  if (cap0) capAt(0, -1, cols ? cols[0] || col : col);
  if (cap1) capAt(prof.length - 1, 1, typeof cap1 === 'object' ? cap1 : (cols ? cols[prof.length - 2] || col : col));
}
const up = (S, x, y, z, prof, seg, col, o) => lathe(S, [x, y, z], [0, 1, 0], prof, seg, col, o);
const sc = (prof, k) => prof.map(([t, r]) => [t * k, r * k]);
function plinth(S, L, y, su, sv, h, col) {
  S.kind = KIND.MASONRY;
  L.box(S, 0, 0, y - 0.3, y + h, su, sv, col, { topKind: KIND.ROAD });
  return y + h;
}
function begin(S, y, kind = KIND.MASONRY) { S.base = y - LAND_Y; S.kind = kind; }
function end(S) { S.kind = KIND.PLAIN; }

// ---------------------------------------------------------------- stone statues of the tombs' salutation courts
// A standing mandarin, hands joined before the chest: civil (văn quan) holding the hốt tablet, in the winged cap
// (mũ cánh chuồn); military (võ quan) with both hands on a sword planted before him, in a helmet. `h` is the height
// from the foot of the plinth to the top of the cap. About 120 triangles.
export function mandarin(S, x, y, z, a, { military = false, h = 2.2, col = C.stone, plinth: pl = true } = {}) {
  const k = h / 2.2, L = local(x, z, a), dk = shade(col, 0.86), lt = shade(col, 1.06);
  begin(S, y);
  let b = y;
  if (pl) b = plinth(S, L, y, 0.78 * k, 0.78 * k, 0.18 * k, shade(col, 0.8));
  const Y = (t) => b + t * k;
  // the robe (áo bào) to the ground, flaring at the hem; the torso and shoulders; the wide sleeves hanging forward
  L.box(S, 0, 0, Y(0), Y(1.2), 0.56 * k, 0.72 * k, col, { taper: 0.8 });
  L.box(S, 0, 0, Y(1.2), Y(1.58), 0.44 * k, 0.58 * k, col, { taper: 0.9 });
  L.box(S, 0.02 * k, 0, Y(1.5), Y(1.62), 0.4 * k, 0.6 * k, lt, { taper: 0.75 }); // the collar and shoulders
  for (const sd of [-1, 1]) L.boxA(S, 0.1 * k, sd * 0.25 * k, Y(0.82), Y(1.5), 0.5 * k, 0.17 * k, sd * 0.12, dk, { taper: 0.9 });
  L.box(S, 0.01 * k, 0, Y(1.08), Y(1.16), 0.6 * k, 0.76 * k, dk); // the belt (đai)
  L.box(S, 0.3 * k, 0, Y(1.16), Y(1.32), 0.16 * k, 0.24 * k, lt); // the joined hands
  if (military) {
    L.box(S, 0.4 * k, 0, Y(0.02), Y(1.2), 0.07 * k, 0.09 * k, dk); // the sword, point down
    L.box(S, 0.4 * k, 0, Y(1.1), Y(1.15), 0.08 * k, 0.3 * k, dk); // its guard
  } else {
    L.box(S, 0.36 * k, 0, Y(1.2), Y(1.66), 0.05 * k, 0.11 * k, lt, { taper: 0.8 }); // the hốt
  }
  // the head; the cap
  L.box(S, 0.02 * k, 0, Y(1.6), Y(1.86), 0.27 * k, 0.24 * k, lt, { taper: 0.9 });
  if (military) {
    L.box(S, 0, 0, Y(1.82), Y(2.0), 0.34 * k, 0.32 * k, dk, { taper: 0.7 });
    L.box(S, 0, 0, Y(1.98), Y(2.06), 0.08 * k, 0.08 * k, dk, { taper: 0.4 });
  } else {
    L.box(S, -0.01 * k, 0, Y(1.82), Y(1.98), 0.3 * k, 0.3 * k, dk, { taper: 0.92 });
    L.box(S, -0.1 * k, 0, Y(1.9), Y(1.96), 0.05 * k, 0.72 * k, dk); // the wings of the cap
  }
  end(S);
}

// A standing elephant with its saddle cloth, trunk hanging, on a low slab; length about 2.7 m at s = 1, 2.1 m
// high. About 170 triangles.
export function elephant(S, x, y, z, a, { s = 1, col = C.stone, plinth: pl = true } = {}) {
  const L = local(x, z, a), dk = shade(col, 0.85), cloth = shade(col, 0.78);
  begin(S, y);
  let b = y;
  if (pl) b = plinth(S, L, y, 2.9 * s, 1.5 * s, 0.2 * s, shade(col, 0.8));
  const Y = (t) => b + t * s, Q = (u, t, v) => L.p3(u * s, Y(t), v * s);
  for (const [u, v] of [[0.72, 0.36], [0.72, -0.36], [-0.72, 0.36], [-0.72, -0.36]]) L.box(S, u * s, v * s, Y(0), Y(0.95), 0.4 * s, 0.4 * s, col, { taper: 0.92 });
  L.box(S, 0, 0, Y(0.85), Y(1.45), 2.1 * s, 1.12 * s, col);
  L.box(S, 0, 0, Y(1.45), Y(1.98), 2.0 * s, 1.1 * s, col, { taper: 0.72 }); // the round of the back
  L.box(S, -0.05 * s, 0, Y(1.3), Y(1.9), 0.95 * s, 1.18 * s, cloth, { taper: 0.82 }); // saddle cloth
  L.box(S, -0.05 * s, 0, Y(1.9), Y(2.08), 0.6 * s, 0.6 * s, cloth); // the cushion
  L.box(S, 1.18 * s, 0, Y(1.05), Y(2.02), 0.62 * s, 0.86 * s, col, { taper: 0.85 }); // head
  for (const sd of [-1, 1]) L.boxA(S, 0.95 * s, sd * 0.56 * s, Y(1.2), Y(1.95), 0.5 * s, 0.07 * s, -sd * 0.35, dk, { taper: 0.8 }); // ears
  S.beam(Q(1.45, 1.4, 0), Q(1.62, 0.75, 0), 0.26 * s, 0.3 * s, col); // trunk
  S.beam(Q(1.62, 0.8, 0), Q(1.58, 0.12, 0), 0.18 * s, 0.2 * s, col);
  for (const sd of [-1, 1]) S.beam(Q(1.45, 1.2, sd * 0.2), Q(1.82, 1.05, sd * 0.24), 0.08 * s, 0.08 * s, shade(col, 1.12)); // tusks
  S.beam(Q(-1.02, 1.6, 0), Q(-1.1, 0.95, 0), 0.08 * s, 0.08 * s, dk); // tail
  end(S);
}

// A standing saddled horse on a low slab; 2 m long, 2.1 m to the ears at s = 1. About 120 triangles.
export function horse(S, x, y, z, a, { s = 1, col = C.stone, plinth: pl = true } = {}) {
  const L = local(x, z, a), dk = shade(col, 0.82);
  begin(S, y);
  let b = y;
  if (pl) b = plinth(S, L, y, 2.1 * s, 0.9 * s, 0.2 * s, shade(col, 0.8));
  const Y = (t) => b + t * s, Q = (u, t, v) => L.p3(u * s, Y(t), v * s);
  for (const [u, v] of [[0.55, 0.16], [0.55, -0.16], [-0.55, 0.16], [-0.55, -0.16]]) L.box(S, u * s, v * s, Y(0), Y(0.98), 0.17 * s, 0.17 * s, col, { taper: 0.85 });
  L.box(S, 0, 0, Y(0.9), Y(1.42), 1.45 * s, 0.52 * s, col, { taper: 0.92 });
  L.box(S, -0.05 * s, 0, Y(1.36), Y(1.5), 0.55 * s, 0.6 * s, dk); // saddle
  S.beam(Q(0.6, 1.25, 0), Q(0.92, 1.9, 0), 0.3 * s, 0.4 * s, col); // neck
  S.beam(Q(0.88, 1.98, 0), Q(1.22, 1.62, 0), 0.22 * s, 0.3 * s, col); // head
  L.box(S, 0.8 * s, 0, Y(1.98), Y(2.1), 0.1 * s, 0.16 * s, dk); // ears
  S.beam(Q(-0.72, 1.35, 0), Q(-0.84, 0.75, 0), 0.12 * s, 0.14 * s, dk); // tail
  end(S);
}

// A seated kỳ lân (or nghê / lion) on its haunches, chest up, head raised, tail curled up behind: about 1.4 m tall
// at s = 1 (plinth not counted). `col` stone or bronze; `plinth` the height of a stone plinth under it (0: none).
// About 140 triangles.
export function kylan(S, x, y, z, a, { s = 1, col = C.stone, plinth: ph = 0, plinthCol = C.stone } = {}) {
  const L = local(x, z, a), dk = shade(col, 0.82), lt = shade(col, 1.15);
  begin(S, y);
  let b = y;
  if (ph > 0) b = plinth(S, L, y, 1.5 * s, 1.0 * s, ph, plinthCol);
  if (col !== C.stone) S.kind = KIND.PLAIN;
  const Y = (t) => b + t * s, Q = (u, t, v) => L.p3(u * s, Y(t), v * s);
  L.box(S, -0.2 * s, 0, Y(0), Y(0.12), 1.1 * s, 0.7 * s, dk); // the base it sits on
  L.box(S, -0.32 * s, 0, Y(0.12), Y(0.55), 0.62 * s, 0.66 * s, col, { taper: 0.9 }); // haunches
  S.beam(Q(-0.28, 0.45, 0), Q(0.12, 1.05, 0), 0.6 * s, 0.5 * s, col); // the chest, rising
  for (const sd of [-1, 1]) L.box(S, 0.18 * s, sd * 0.17 * s, Y(0.12), Y(0.82), 0.16 * s, 0.15 * s, col, { taper: 0.85 }); // forelegs
  L.box(S, 0.12 * s, 0, Y(0.95), Y(1.2), 0.48 * s, 0.58 * s, dk); // the mane
  L.box(S, 0.24 * s, 0, Y(1.0), Y(1.34), 0.42 * s, 0.4 * s, col, { taper: 0.85 }); // head
  L.box(S, 0.48 * s, 0, Y(1.02), Y(1.2), 0.2 * s, 0.3 * s, lt); // snout and open jaw
  L.box(S, 0.16 * s, 0, Y(1.32), Y(1.46), 0.1 * s, 0.1 * s, lt, { taper: 0.3 }); // the horn
  S.beam(Q(-0.62, 0.3, 0), Q(-0.72, 0.85, 0), 0.12 * s, 0.14 * s, dk); // the tail, curled up and over
  S.beam(Q(-0.72, 0.85, 0), Q(-0.52, 1.0, 0), 0.16 * s, 0.12 * s, dk);
  end(S);
}

// ---------------------------------------------------------------- bronze
// Vạc đồng: the great two-handled cauldron of the Nguyễn courts (cast 1659-1684 under the lords): a broad round
// body, a waisted neck and a flared rim, the inside dark, handles standing on the rim, the whole on three short iron
// feet. `d` is the rim's diameter (the Tả Vu vạc: 2.2 m across, 1.05 m body, 1.30 m to the handle tops).
// About 330 triangles.
export function vac(S, x, y, z, a, { d = 2.0, handles = 4, col = C.bronze, legs = 0.32 } = {}) {
  const k = d / 2.2, L = local(x, z, a), b = y + legs * k;
  begin(S, y, KIND.PLAIN);
  // three feet of the iron trivet (kiềng)
  for (let i = 0; i < 3; i++) {
    const th = a + Math.PI / 6 + (i * 2 * Math.PI) / 3, cx = Math.cos(th), cz = Math.sin(th);
    S.beam([x + cx * 0.42 * k, b + 0.12 * k, z + cz * 0.42 * k], [x + cx * 0.6 * k, y, z + cz * 0.6 * k], 0.12 * k, 0.14 * k, C.iron);
  }
  // body, outside up, over the lip, down the inside (the bottom of the inside capped dark)
  const prof = sc([[0, 0], [0.02, 0.42], [0.18, 0.72], [0.45, 0.94], [0.72, 0.99], [0.88, 0.95], [0.97, 1.0], [1.05, 1.1], [1.07, 1.08], [1.03, 0.98], [0.75, 0.9], [0.4, 0.66]], k);
  const cols = prof.map((_, i) => (i === 4 ? shade(col, 1.12) : i === 6 || i === 7 ? shade(col, 1.2) : i >= 8 ? shade(col, 0.45) : col));
  up(S, x, b, z, prof, 12, col, { cap0: false, cap1: C.mouth, cols, rot: a });
  // handles: upright loops on the rim, across the radius
  for (let i = 0; i < handles; i++) {
    const th = (i * 2 * Math.PI) / handles, r = 1.0 * k, u = Math.cos(th) * r, v = Math.sin(th) * r;
    const tu = -Math.sin(th), tv = Math.cos(th), w = 0.17 * k, y0 = b + 1.0 * k, y1 = b + 1.28 * k;
    const p0 = L.p3(u - tu * w, y0, v - tv * w), p1 = L.p3(u + tu * w, y0, v + tv * w);
    const q0 = L.p3(u - tu * w, y1, v - tv * w), q1 = L.p3(u + tu * w, y1, v + tv * w);
    const hc = shade(col, 1.1);
    S.beam(p0, q0, 0.07 * k, 0.09 * k, hc);
    S.beam(p1, q1, 0.07 * k, 0.09 * k, hc);
    S.beam([q0[0], q0[1] - 0.04 * k, q0[2]], [q1[0], q1[1] - 0.04 * k, q1[2]], 0.09 * k, 0.1 * k, hc);
  }
  end(S);
}

// Đỉnh: a bronze urn on three legs with two upright loop handles: the dynastic urns (Cửu Đỉnh, about 2.3 m) when
// `lid` is false, an incense burner (lư đỉnh) with a domed lid and a knob when it is true. `h` from the foot of its
// stone stand (`stand`, metres high, 0: none) to the handle tops. Two loops lie across the facing direction a.
// About 300 triangles.
export function dinh(S, x, y, z, a, { h = 2.33, col = C.bronze, lid = false, stand = 0.22, standCol = C.stone, standW = null } = {}) {
  const k = (h - stand) / 2.11, L = local(x, z, a);
  begin(S, y);
  if (stand > 0) { const w = standW ?? 2.3 * k; plinth(S, L, y, w, w, stand + 0.05, standCol); }
  S.kind = KIND.PLAIN;
  const b = y + stand;
  // three legs, splayed a little, toes out
  for (let i = 0; i < 3; i++) {
    const th = a + Math.PI / 2 + (i * 2 * Math.PI) / 3, cx = Math.cos(th), cz = Math.sin(th);
    S.beam([x + cx * 0.52 * k, b + 0.66 * k, z + cz * 0.52 * k], [x + cx * 0.66 * k, b, z + cz * 0.66 * k], 0.2 * k, 0.24 * k, col);
    S.beam([x + cx * 0.66 * k, b + 0.05 * k, z + cz * 0.66 * k], [x + cx * 0.8 * k, b + 0.02 * k, z + cz * 0.8 * k], 0.22 * k, 0.1 * k, col);
  }
  // belly, waist, rim; inside dark
  const prof = sc([[0.5, 0.3], [0.56, 0.5], [0.72, 0.7], [1.0, 0.79], [1.36, 0.75], [1.56, 0.62], [1.74, 0.62], [1.86, 0.68], [1.9, 0.7], [1.92, 0.64], [1.7, 0.56]], k);
  const cols = prof.map((_, i) => (i === 3 ? shade(col, 1.1) : i === 7 || i === 8 ? shade(col, 1.2) : i >= 8 ? shade(col, 0.45) : col));
  up(S, x, b, z, prof, 12, col, { cap0: true, cap1: lid ? col : C.mouth, cols, rot: a });
  if (lid) { // domed lid and a knob
    up(S, x, b + 1.84 * k, z, sc([[0, 0.66], [0.12, 0.6], [0.3, 0.36], [0.38, 0.14], [0.56, 0.1], [0.62, 0]], k), 10, shade(col, 1.08), { cap0: false, cap1: false, rot: a });
  }
  // the two loop handles on the rim
  const yt = y + h, y0 = b + 1.85 * k;
  for (const sd of [-1, 1]) {
    const pA = L.p3(-0.22 * k, y0, sd * 0.66 * k), pB = L.p3(0.22 * k, y0, sd * 0.66 * k);
    const qA = L.p3(-0.22 * k, yt, sd * 0.7 * k), qB = L.p3(0.22 * k, yt, sd * 0.7 * k);
    const hc = shade(col, 1.12);
    S.beam(pA, qA, 0.1 * k, 0.12 * k, hc);
    S.beam(pB, qB, 0.1 * k, 0.12 * k, hc);
    S.beam([qA[0], qA[1] - 0.05 * k, qA[2]], [qB[0], qB[1] - 0.05 * k, qB[2]], 0.12 * k, 0.12 * k, hc);
  }
  end(S);
}

// Hạc đồng: a bronze crane standing on the back of a tortoise, neck up, beak raised (the pair that flank a Nguyễn
// throne or altar). `h` to the crown of the head; 1.9 m at default. About 150 triangles.
export function crane(S, x, y, z, a, { h = 1.9, col = C.bronze } = {}) {
  const k = h / 1.9, L = local(x, z, a), Q = (u, t, v) => L.p3(u * k, y + t * k, v * k), lt = shade(col, 1.18);
  begin(S, y, KIND.PLAIN);
  // the tortoise: domed shell, head out in front, four flippers
  lathe(S, [x, y, z], [0, 1, 0], sc([[0, 0], [0.02, 0.5], [0.12, 0.54], [0.26, 0.42], [0.36, 0.2], [0.38, 0]], k), 8, col, { cap0: false, cap1: false, rot: a });
  S.beam(Q(0.45, 0.12, 0), Q(0.78, 0.22, 0), 0.16 * k, 0.14 * k, col);
  for (const [u, v] of [[0.32, 0.42], [0.32, -0.42], [-0.32, 0.42], [-0.32, -0.42]]) L.box(S, u * k, v * k, y, y + 0.06 * k, 0.28 * k, 0.16 * k, col);
  // the crane: two thin legs from the shell, the body, the long neck in two runs, head and beak, tail feathers
  for (const sd of [-1, 1]) S.beam(Q(0, 0.34, sd * 0.09), Q(-0.02, 0.92, sd * 0.1), 0.05 * k, 0.05 * k, col);
  S.beam(Q(-0.22, 1.02, 0), Q(0.2, 1.06, 0), 0.34 * k, 0.32 * k, col); // body
  for (const sd of [-1, 1]) S.beam(Q(0.12, 1.1, sd * 0.16), Q(-0.32, 1.06, sd * 0.18), 0.05 * k, 0.24 * k, lt); // folded wings
  S.beam(Q(-0.2, 1.04, 0), Q(-0.4, 0.92, 0), 0.18 * k, 0.12 * k, col); // tail
  S.beam(Q(0.18, 1.12, 0), Q(0.24, 1.55, 0), 0.1 * k, 0.11 * k, col); // neck
  S.beam(Q(0.24, 1.53, 0), Q(0.2, 1.84, 0), 0.08 * k, 0.09 * k, col);
  S.beam(Q(0.18, 1.86, 0), Q(0.3, 1.86, 0), 0.1 * k, 0.1 * k, col); // head
  S.beam(Q(0.3, 1.86, 0), Q(0.5, 1.92, 0), 0.04 * k, 0.04 * k, lt); // beak, raised
  end(S);
}

// Thiết đình: the small open metal kiosk that shelters a bronze beast in a temple court (Thế Miếu's kỳ lân stand
// in a pair of them, vi.wikipedia). Its form is estimated: a stone slab, four slender posts, a low railing on the
// sides, and a flared pyramid roof with a knob. `w` the plan's side, `h` the posts' height above the slab. Draw the
// statue inside separately. About 90 triangles.
export function kiosk(S, x, y, z, a, { w = 2.6, h = 3.2, col = C.iron, slab = 0.25, slabCol = C.stone } = {}) {
  const L = local(x, z, a), b = y + slab, t = b + h, e = w / 2 - 0.1, dk = shade(col, 0.8);
  begin(S, y);
  L.box(S, 0, 0, y - 0.3, b, w + 0.3, w + 0.3, slabCol, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) L.box(S, su * e, sv * e, b, t, 0.12, 0.12, col);
  for (const sd of [-1, 1]) { // a low rail on the two sides, open front and back
    L.box(S, 0, sd * e, b + 0.55, b + 0.62, 2 * e, 0.06, col);
    L.box(S, sd * e, 0, b + 0.55, b + 0.62, 0.06, 2 * e, col);
  }
  L.box(S, 0, 0, t, t + 0.16, w + 0.2, w + 0.2, dk); // the eave plate
  L.box(S, 0, 0, t + 0.16, t + 0.3, w + 0.7, w + 0.7, col, { taper: 0.82 }); // the flared skirt
  L.box(S, 0, 0, t + 0.3, t + 1.05, (w + 0.7) * 0.82, (w + 0.7) * 0.82, col, { taper: 0.12 }); // the pyramid
  L.box(S, 0, 0, t + 1.0, t + 1.25, 0.16, 0.16, shade(col, 1.3), { taper: 0.5 }); // the knob
  end(S);
}

// Thần công: a long bronze cannon on its low wooden carriage, the muzzle toward a. `len` the barrel with its knob
// (the Huế nine are about 5.1 m); `r` the breech radius. About 260 triangles.
export function cannon(S, x, y, z, a, { len = 5.1, r = null, col = C.bronze, wood = C.wood, carriage = true } = {}) {
  const R = r ?? len * 0.068, L = local(x, z, a), hc = carriage ? y + R + 0.3 * (len / 5.1) + 0.05 : y + R;
  begin(S, y, KIND.PLAIN);
  if (carriage) {
    const k = len / 5.1, cl = len * 0.62;
    for (const sd of [-1, 1]) L.box(S, -0.05 * len, sd * (R * 0.9), y + 0.16 * k, hc - R * 0.2, cl, 0.14 * k, wood, { taper: 1 }); // cheeks
    L.box(S, -0.05 * len, 0, y + 0.16 * k, y + 0.28 * k, cl * 0.9, R * 1.8, shade(wood, 0.85)); // bed
    for (const su of [-0.32, 0.22]) {
      const wr = 0.24 * k;
      for (const sd of [-1, 1]) lathe(S, L.p3(su * len, y + wr, sd * (R * 0.9 + 0.07 * k)), L.dir(0, 0, sd), [[0, wr], [0.12 * k, wr]], 8, shade(wood, 0.75), { rot: 0 });
    }
  }
  // the barrel along +u: knob, breech, reinforcing rings, chase, swelled muzzle, the bore
  const prof = [[-0.06, 0], [-0.04, 0.4], [0, 0.3], [0, 1.0], [0.08, 1.04], [0.08, 1.12], [0.12, 1.12], [0.12, 1.0], [0.45, 0.86], [0.45, 0.94], [0.48, 0.94], [0.48, 0.84], [0.9, 0.7], [0.93, 0.8], [0.95, 0.84], [0.95, 0.42], [0.85, 0.4]]
    .map(([t, rr]) => [t * len, rr * R]);
  const cols = prof.map((_, i) => (i === 4 || i === 5 || i === 9 || i === 10 ? shade(col, 1.2) : i >= 14 ? C.mouth : col));
  lathe(S, L.p3(-len * 0.5, hc, 0), L.dir(1, 0, 0), prof, 10, col, { cap0: false, cap1: C.mouth, cols });
  S.beam(L.p3(-len * 0.05, hc, -R * 1.05), L.p3(-len * 0.05, hc, R * 1.05), R * 0.35, R * 0.35, col); // trunnions
  end(S);
}

// ---------------------------------------------------------------- glazed jars and planters
// A glazed jar (chum): a round body, short neck, rolled lip. `h` its height. About 110 triangles.
export function jar(S, x, y, z, { h = 0.9, col = C.glazeBrown, band = null } = {}) {
  begin(S, y, KIND.PLAIN);
  const prof = sc([[0, 0.3], [0.08, 0.4], [0.35, 0.5], [0.62, 0.46], [0.82, 0.32], [0.9, 0.28], [0.96, 0.31], [1.0, 0.3], [0.97, 0.25]], h);
  up(S, x, y, z, prof, 10, col, { cap0: false, cap1: C.mouth, cols: band ? prof.map((_, i) => (i === 2 ? band : col)) : null });
  end(S);
}

// A planter for a clipped tree (bồn cảnh): on a stone stool (đôn) `stand` high when given, a glazed pot, the tree a
// short trunk and two or three clipped tiers. `r` the pot's radius. About 130 triangles.
export function planter(S, x, y, z, a, { r = 0.42, stand = 0.5, standCol = C.stone, col = C.glazeBlue, band = C.glazeWhite, tree = true, square = false } = {}) {
  const L = local(x, z, a);
  begin(S, y);
  let b = y;
  if (stand > 0) {
    if (square) { L.box(S, 0, 0, y - 0.05, y + stand, r * 2, r * 2, standCol, { taper: 0.92 }); }
    else up(S, x, y - 0.05, z, [[0, r * 0.82], [0.12, r * 0.9], [stand * 0.6 + 0.05, r * 0.78], [stand + 0.05, r * 0.9]], 8, standCol, { cap0: false, rot: a });
    b = y + stand;
  }
  S.kind = KIND.PLAIN;
  const pot = sc([[0, 0.68], [0.06, 0.8], [0.5, 1.0], [0.6, 1.08], [0.66, 1.06], [0.62, 0.96]], r);
  up(S, x, b, z, pot, 10, col, { cap0: false, cap1: shade(C.bark, 0.8), cols: pot.map((_, i) => (i === 2 || i === 3 ? band : col)), rot: a });
  if (tree) {
    const t0 = b + 0.6 * r;
    S.beam([x, t0, z], [x + Math.cos(a + 0.8) * r * 0.25, t0 + r * 1.2, z + Math.sin(a + 0.8) * r * 0.25], r * 0.18, r * 0.18, C.bark);
    const tiers = [[1.0, 1.35, 1.2], [1.45, 1.75, 0.9], [1.85, 2.1, 0.55]];
    for (const [y0, y1, rr] of tiers) up(S, x + Math.cos(a + 0.8) * r * 0.2, t0 + y0 * r, z + Math.sin(a + 0.8) * r * 0.2, [[0, rr * r * 0.7], [(y1 - y0) * r * 0.35, rr * r], [(y1 - y0) * r, rr * r * 0.45]], 7, y0 > 1.4 ? C.leaf : C.leafDark, { rot: a });
  }
  end(S);
}
