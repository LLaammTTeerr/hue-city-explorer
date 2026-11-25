// Courtyard props, shared by the tombs, the Imperial City's courts and the temples: stone statues (mandarins,
// elephants, horses, kỳ lân), bronze vessels (vạc, đỉnh), the bronze crane on its tortoise (hạc đồng), the bronze
// cannon on its carriage (thần công), glazed jars and planters. Low-poly but each read by its silhouette; most are
// repeated, so each stays at a few hundred triangles or less (counts beside each builder).
//
// Every builder writes into the shared static buffer S and takes (S, x, y, z, angle, opts): (x, z) the centre of its
// foot on the ground, y the level it stands on (the paving's top, not the ground under it), angle the direction it faces
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

const VAC_PROFILE = [
  [0, 0], [0.02, 0.42], [0.18, 0.72], [0.45, 0.94], [0.72, 0.99], [0.88, 0.95],
  [0.97, 1.0], [1.05, 1.1], [1.07, 1.08], [1.03, 0.98], [0.75, 0.9], [0.4, 0.66],
];
const DINH_PROFILE = [
  [0.5, 0.3], [0.56, 0.5], [0.72, 0.7], [1.0, 0.79], [1.36, 0.75], [1.56, 0.62],
  [1.74, 0.62], [1.86, 0.68], [1.9, 0.7], [1.92, 0.64], [1.7, 0.56],
];
const DINH_LID_PROFILE = [[0, 0.66], [0.12, 0.6], [0.3, 0.36], [0.38, 0.14], [0.56, 0.1], [0.62, 0]];
const TORTOISE_PROFILE = [[0, 0], [0.02, 0.5], [0.12, 0.54], [0.26, 0.42], [0.36, 0.2], [0.38, 0]];
const CANNON_PROFILE = [
  [-0.06, 0], [-0.04, 0.4], [0, 0.3], [0, 1.0], [0.08, 1.04], [0.08, 1.12], [0.12, 1.12], [0.12, 1.0],
  [0.45, 0.86], [0.45, 0.94], [0.48, 0.94], [0.48, 0.84], [0.9, 0.7], [0.93, 0.8], [0.95, 0.84], [0.95, 0.42], [0.85, 0.4],
];
const JAR_PROFILE = [[0, 0.3], [0.08, 0.4], [0.35, 0.5], [0.62, 0.46], [0.82, 0.32], [0.9, 0.28], [0.96, 0.31], [1.0, 0.3], [0.97, 0.25]];
const POT_PROFILE = [[0, 0.68], [0.06, 0.8], [0.5, 1.0], [0.6, 1.08], [0.66, 1.06], [0.62, 0.96]];
const PLANTER_TREE_TIERS = [[1.0, 1.35, 1.2], [1.45, 1.75, 0.9], [1.85, 2.1, 0.55]];
const MIN_LATHE_RADIUS = 1e-4;

// ---------------------------------------------------------------- local frame and two generic shapes
function localFrame(x, z, angle) {
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const toWorld = (u, v) => [x + u * cosA - v * sinA, z + u * sinA + v * cosA];
  return {
    a: angle,
    p: toWorld,
    p3: (u, y, v) => [x + u * cosA - v * sinA, y, z + u * sinA + v * cosA],
    dir: (du, dy, dv) => [du * cosA - dv * sinA, dy, du * sinA + dv * cosA],
    box: (S, u, v, y0, y1, su, sv, col, opts?) => { const pt = toWorld(u, v); S.box(pt[0], pt[1], y0, y1, su, sv, angle, col, opts); },
    boxA: (S, u, v, y0, y1, su, sv, dAngle, col, opts?) => { const pt = toWorld(u, v); S.box(pt[0], pt[1], y0, y1, su, sv, angle + dAngle, col, opts); },
  };
}

const norm3 = (vec) => {
  const len = Math.hypot(vec[0], vec[1], vec[2]) || 1;
  return [vec[0] / len, vec[1] / len, vec[2] / len];
};
const cross3 = (vecA, vecB) => [
  vecA[1] * vecB[2] - vecA[2] * vecB[1],
  vecA[2] * vecB[0] - vecA[0] * vecB[2],
  vecA[0] * vecB[1] - vecA[1] * vecB[0],
];

// A solid of revolution about any axis: from point `origin` along `axis`, profile [[t, r], ...] listed so that the
// outside lies to the right of the walk (up the outside, in over a rim, down an inside).
export function lathe(S, origin, axis, prof, seg, col, { cap0 = true, cap1 = true, rot = 0, cols = null }: Record<string, any> = {}) {
  const dir = norm3(axis);
  const ref = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const basis1 = norm3(cross3(dir, ref));
  const basis2 = cross3(dir, basis1);
  const ringPt = (along, radius, theta) => {
    const cs = Math.cos(theta) * radius;
    const sn = Math.sin(theta) * radius;
    return [
      origin[0] + dir[0] * along + basis1[0] * cs + basis2[0] * sn,
      origin[1] + dir[1] * along + basis1[1] * cs + basis2[1] * sn,
      origin[2] + dir[2] * along + basis1[2] * cs + basis2[2] * sn,
    ];
  };
  for (let i = 0; i + 1 < prof.length; i++) {
    const [t0, r0] = prof[i];
    const [t1, r1] = prof[i + 1];
    const nt = -(r1 - r0), nr = t1 - t0;
    const bandCol = cols ? cols[i] || col : col;
    for (let k = 0; k < seg; k++) {
      const a0 = rot + (k / seg) * Math.PI * 2;
      const a1 = rot + ((k + 1) / seg) * Math.PI * 2;
      const aMid = (a0 + a1) / 2;
      const rx = basis1[0] * Math.cos(aMid) + basis2[0] * Math.sin(aMid);
      const ry = basis1[1] * Math.cos(aMid) + basis2[1] * Math.sin(aMid);
      const rz = basis1[2] * Math.cos(aMid) + basis2[2] * Math.sin(aMid);
      const hint = [dir[0] * nt + rx * nr, dir[1] * nt + ry * nr, dir[2] * nt + rz * nr];
      const v0 = ringPt(t0, r0, a0), v1 = ringPt(t0, r0, a1);
      const v2 = ringPt(t1, r1, a1), v3 = ringPt(t1, r1, a0);
      if (r0 < MIN_LATHE_RADIUS) S.tri(v0, v2, v3, bandCol, hint);
      else if (r1 < MIN_LATHE_RADIUS) S.tri(v0, v1, v2, bandCol, hint);
      else S.quad(v0, v1, v2, v3, bandCol, hint);
    }
  }
  const capAt = (idx, sign, capCol) => {
    const [along, radius] = prof[idx];
    if (radius < MIN_LATHE_RADIUS) return;
    const center = ringPt(along, 0, 0);
    const hint = [dir[0] * sign, dir[1] * sign, dir[2] * sign];
    for (let k = 0; k < seg; k++) {
      S.tri(center, ringPt(along, radius, rot + (k / seg) * Math.PI * 2), ringPt(along, radius, rot + ((k + 1) / seg) * Math.PI * 2), capCol, hint);
    }
  };
  if (cap0) capAt(0, -1, cols ? cols[0] || col : col);
  if (cap1) capAt(prof.length - 1, 1, typeof cap1 === 'object' ? cap1 : (cols ? cols[prof.length - 2] || col : col));
}

const latheUp = (S, x, y, z, prof, seg, col, opts) => lathe(S, [x, y, z], [0, 1, 0], prof, seg, col, opts);
const scaleProfile = (prof, scale) => prof.map(([along, radius]) => [along * scale, radius * scale]);

function buildPlinth(S, frame, y, su, sv, height, col) {
  S.kind = KIND.MASONRY;
  frame.box(S, 0, 0, y - 0.3, y + height, su, sv, col, { topKind: KIND.ROAD });
  return y + height;
}
function beginProp(S, y, kind = KIND.MASONRY) { S.base = y - LAND_Y; S.kind = kind; }
function endProp(S) { S.kind = KIND.PLAIN; }

// ---------------------------------------------------------------- stone statues of the tombs' salutation courts
// A standing mandarin, hands joined before the chest: civil (văn quan) or military (võ quan). About 120 triangles.
export function mandarin(S, x, y, z, angle, { military = false, h = 2.2, col = PROP_COL.stone, plinth = true } = {}) {
  const scale = h / 2.2;
  const frame = localFrame(x, z, angle);
  const darkCol = shade(col, 0.86), lightCol = shade(col, 1.06);
  beginProp(S, y);
  const baseY = plinth ? buildPlinth(S, frame, y, 0.78 * scale, 0.78 * scale, 0.18 * scale, shade(col, 0.8)) : y;
  const yAt = (offset) => baseY + offset * scale;

  frame.box(S, 0, 0, yAt(0), yAt(1.2), 0.56 * scale, 0.72 * scale, col, { taper: 0.8 });
  frame.box(S, 0, 0, yAt(1.2), yAt(1.58), 0.44 * scale, 0.58 * scale, col, { taper: 0.9 });
  frame.box(S, 0.02 * scale, 0, yAt(1.5), yAt(1.62), 0.4 * scale, 0.6 * scale, lightCol, { taper: 0.75 });
  for (const side of [-1, 1]) {
    frame.boxA(S, 0.1 * scale, side * 0.25 * scale, yAt(0.82), yAt(1.5), 0.5 * scale, 0.17 * scale, side * 0.12, darkCol, { taper: 0.9 });
  }
  frame.box(S, 0.01 * scale, 0, yAt(1.08), yAt(1.16), 0.6 * scale, 0.76 * scale, darkCol);
  frame.box(S, 0.3 * scale, 0, yAt(1.16), yAt(1.32), 0.16 * scale, 0.24 * scale, lightCol);
  if (military) {
    frame.box(S, 0.4 * scale, 0, yAt(0.02), yAt(1.2), 0.07 * scale, 0.09 * scale, darkCol);
    frame.box(S, 0.4 * scale, 0, yAt(1.1), yAt(1.15), 0.08 * scale, 0.3 * scale, darkCol);
  } else {
    frame.box(S, 0.36 * scale, 0, yAt(1.2), yAt(1.66), 0.05 * scale, 0.11 * scale, lightCol, { taper: 0.8 });
  }
  frame.box(S, 0.02 * scale, 0, yAt(1.6), yAt(1.86), 0.27 * scale, 0.24 * scale, lightCol, { taper: 0.9 });
  if (military) {
    frame.box(S, 0, 0, yAt(1.82), yAt(2.0), 0.34 * scale, 0.32 * scale, darkCol, { taper: 0.7 });
    frame.box(S, 0, 0, yAt(1.98), yAt(2.06), 0.08 * scale, 0.08 * scale, darkCol, { taper: 0.4 });
  } else {
    frame.box(S, -0.01 * scale, 0, yAt(1.82), yAt(1.98), 0.3 * scale, 0.3 * scale, darkCol, { taper: 0.92 });
    frame.box(S, -0.1 * scale, 0, yAt(1.9), yAt(1.96), 0.05 * scale, 0.72 * scale, darkCol);
  }
  endProp(S);
}

// A standing elephant with its saddle cloth, trunk hanging, on a low slab. About 170 triangles.
export function elephant(S, x, y, z, angle, { s = 1, col = PROP_COL.stone, plinth = true } = {}) {
  const frame = localFrame(x, z, angle);
  const darkCol = shade(col, 0.85), clothCol = shade(col, 0.78);
  beginProp(S, y);
  const baseY = plinth ? buildPlinth(S, frame, y, 2.9 * s, 1.5 * s, 0.2 * s, shade(col, 0.8)) : y;
  const yAt = (offset) => baseY + offset * s;
  const pt3 = (u, dy, v) => frame.p3(u * s, yAt(dy), v * s);

  for (const [lu, lv] of [[0.72, 0.36], [0.72, -0.36], [-0.72, 0.36], [-0.72, -0.36]]) {
    frame.box(S, lu * s, lv * s, yAt(0), yAt(0.95), 0.4 * s, 0.4 * s, col, { taper: 0.92 });
  }
  frame.box(S, 0, 0, yAt(0.85), yAt(1.45), 2.1 * s, 1.12 * s, col);
  frame.box(S, 0, 0, yAt(1.45), yAt(1.98), 2.0 * s, 1.1 * s, col, { taper: 0.72 });
  frame.box(S, -0.05 * s, 0, yAt(1.3), yAt(1.9), 0.95 * s, 1.18 * s, clothCol, { taper: 0.82 });
  frame.box(S, -0.05 * s, 0, yAt(1.9), yAt(2.08), 0.6 * s, 0.6 * s, clothCol);
  frame.box(S, 1.18 * s, 0, yAt(1.05), yAt(2.02), 0.62 * s, 0.86 * s, col, { taper: 0.85 });
  for (const side of [-1, 1]) {
    frame.boxA(S, 0.95 * s, side * 0.56 * s, yAt(1.2), yAt(1.95), 0.5 * s, 0.07 * s, -side * 0.35, darkCol, { taper: 0.8 });
  }
  S.beam(pt3(1.45, 1.4, 0), pt3(1.62, 0.75, 0), 0.26 * s, 0.3 * s, col);
  S.beam(pt3(1.62, 0.8, 0), pt3(1.58, 0.12, 0), 0.18 * s, 0.2 * s, col);
  for (const side of [-1, 1]) S.beam(pt3(1.45, 1.2, side * 0.2), pt3(1.82, 1.05, side * 0.24), 0.08 * s, 0.08 * s, shade(col, 1.12));
  S.beam(pt3(-1.02, 1.6, 0), pt3(-1.1, 0.95, 0), 0.08 * s, 0.08 * s, darkCol);
  endProp(S);
}

// A standing saddled horse on a low slab; 2 m long, 2.1 m to the ears at s = 1. About 120 triangles.
export function horse(S, x, y, z, angle, { s = 1, col = PROP_COL.stone, plinth = true } = {}) {
  const frame = localFrame(x, z, angle);
  const darkCol = shade(col, 0.82);
  beginProp(S, y);
  const baseY = plinth ? buildPlinth(S, frame, y, 2.1 * s, 0.9 * s, 0.2 * s, shade(col, 0.8)) : y;
  const yAt = (offset) => baseY + offset * s;
  const pt3 = (u, dy, v) => frame.p3(u * s, yAt(dy), v * s);

  for (const [lu, lv] of [[0.55, 0.16], [0.55, -0.16], [-0.55, 0.16], [-0.55, -0.16]]) {
    frame.box(S, lu * s, lv * s, yAt(0), yAt(0.98), 0.17 * s, 0.17 * s, col, { taper: 0.85 });
  }
  frame.box(S, 0, 0, yAt(0.9), yAt(1.42), 1.45 * s, 0.52 * s, col, { taper: 0.92 });
  frame.box(S, -0.05 * s, 0, yAt(1.36), yAt(1.5), 0.55 * s, 0.6 * s, darkCol);
  S.beam(pt3(0.6, 1.25, 0), pt3(0.92, 1.9, 0), 0.3 * s, 0.4 * s, col);
  S.beam(pt3(0.88, 1.98, 0), pt3(1.22, 1.62, 0), 0.22 * s, 0.3 * s, col);
  frame.box(S, 0.8 * s, 0, yAt(1.98), yAt(2.1), 0.1 * s, 0.16 * s, darkCol);
  S.beam(pt3(-0.72, 1.35, 0), pt3(-0.84, 0.75, 0), 0.12 * s, 0.14 * s, darkCol);
  endProp(S);
}

// A seated kỳ lân (or nghê / lion) on its haunches, chest up, head raised, tail curled up behind. About 140 triangles.
export function kylan(S, x, y, z, angle, { s = 1, col = PROP_COL.stone, plinth = 0, plinthCol = PROP_COL.stone } = {}) {
  const frame = localFrame(x, z, angle);
  const darkCol = shade(col, 0.82), lightCol = shade(col, 1.15);
  beginProp(S, y);
  const baseY = plinth > 0 ? buildPlinth(S, frame, y, 1.5 * s, 1.0 * s, plinth, plinthCol) : y;
  if (col !== PROP_COL.stone) S.kind = KIND.PLAIN;
  const yAt = (offset) => baseY + offset * s;
  const pt3 = (u, dy, v) => frame.p3(u * s, yAt(dy), v * s);

  frame.box(S, -0.2 * s, 0, yAt(0), yAt(0.12), 1.1 * s, 0.7 * s, darkCol);
  frame.box(S, -0.32 * s, 0, yAt(0.12), yAt(0.55), 0.62 * s, 0.66 * s, col, { taper: 0.9 });
  S.beam(pt3(-0.28, 0.45, 0), pt3(0.12, 1.05, 0), 0.6 * s, 0.5 * s, col);
  for (const side of [-1, 1]) frame.box(S, 0.18 * s, side * 0.17 * s, yAt(0.12), yAt(0.82), 0.16 * s, 0.15 * s, col, { taper: 0.85 });
  frame.box(S, 0.12 * s, 0, yAt(0.95), yAt(1.2), 0.48 * s, 0.58 * s, darkCol);
  frame.box(S, 0.24 * s, 0, yAt(1.0), yAt(1.34), 0.42 * s, 0.4 * s, col, { taper: 0.85 });
  frame.box(S, 0.48 * s, 0, yAt(1.02), yAt(1.2), 0.2 * s, 0.3 * s, lightCol);
  frame.box(S, 0.16 * s, 0, yAt(1.32), yAt(1.46), 0.1 * s, 0.1 * s, lightCol, { taper: 0.3 });
  S.beam(pt3(-0.62, 0.3, 0), pt3(-0.72, 0.85, 0), 0.12 * s, 0.14 * s, darkCol);
  S.beam(pt3(-0.72, 0.85, 0), pt3(-0.52, 1.0, 0), 0.16 * s, 0.12 * s, darkCol);
  endProp(S);
}

// ---------------------------------------------------------------- bronze
// Vạc đồng: the great cauldron of the Nguyễn courts. About 330 triangles.
export function vac(S, x, y, z, angle, { d = 2.0, handles = 4, col = PROP_COL.bronze, legs = 0.32 } = {}) {
  const scale = d / 2.2;
  const frame = localFrame(x, z, angle);
  const baseY = y + legs * scale;
  beginProp(S, y, KIND.PLAIN);

  for (let i = 0; i < 3; i++) {
    const theta = angle + Math.PI / 6 + (i * 2 * Math.PI) / 3;
    const cx = Math.cos(theta), cz = Math.sin(theta);
    S.beam([x + cx * 0.42 * scale, baseY + 0.12 * scale, z + cz * 0.42 * scale], [x + cx * 0.6 * scale, y, z + cz * 0.6 * scale], 0.12 * scale, 0.14 * scale, PROP_COL.iron);
  }
  const prof = scaleProfile(VAC_PROFILE, scale);
  const cols = prof.map((_, i) => (i === 4 ? shade(col, 1.12) : i === 6 || i === 7 ? shade(col, 1.2) : i >= 8 ? shade(col, 0.45) : col));
  latheUp(S, x, baseY, z, prof, 12, col, { cap0: false, cap1: PROP_COL.mouth, cols, rot: angle });

  for (let i = 0; i < handles; i++) {
    const theta = (i * 2 * Math.PI) / handles;
    const radius = 1.0 * scale;
    const u = Math.cos(theta) * radius, v = Math.sin(theta) * radius;
    const tu = -Math.sin(theta), tv = Math.cos(theta);
    const halfSpan = 0.17 * scale;
    const y0 = baseY + 1.0 * scale, y1 = baseY + 1.28 * scale;
    const p0 = frame.p3(u - tu * halfSpan, y0, v - tv * halfSpan);
    const p1 = frame.p3(u + tu * halfSpan, y0, v + tv * halfSpan);
    const q0 = frame.p3(u - tu * halfSpan, y1, v - tv * halfSpan);
    const q1 = frame.p3(u + tu * halfSpan, y1, v + tv * halfSpan);
    const handleCol = shade(col, 1.1);
    S.beam(p0, q0, 0.07 * scale, 0.09 * scale, handleCol);
    S.beam(p1, q1, 0.07 * scale, 0.09 * scale, handleCol);
    S.beam([q0[0], q0[1] - 0.04 * scale, q0[2]], [q1[0], q1[1] - 0.04 * scale, q1[2]], 0.09 * scale, 0.1 * scale, handleCol);
  }
  endProp(S);
}

// Đỉnh: a bronze urn on three legs with two upright loop handles. About 300 triangles.
export function dinh(S, x, y, z, angle, { h = 2.33, col = PROP_COL.bronze, lid = false, stand = 0.22, standCol = PROP_COL.stone, standW = null } = {}) {
  const scale = (h - stand) / 2.11;
  const frame = localFrame(x, z, angle);
  beginProp(S, y);
  if (stand > 0) {
    const width = standW ?? 2.3 * scale;
    buildPlinth(S, frame, y, width, width, stand + 0.05, standCol);
  }
  S.kind = KIND.PLAIN;
  const baseY = y + stand;

  for (let i = 0; i < 3; i++) {
    const theta = angle + Math.PI / 2 + (i * 2 * Math.PI) / 3;
    const cx = Math.cos(theta), cz = Math.sin(theta);
    S.beam([x + cx * 0.52 * scale, baseY + 0.66 * scale, z + cz * 0.52 * scale], [x + cx * 0.66 * scale, baseY, z + cz * 0.66 * scale], 0.2 * scale, 0.24 * scale, col);
    S.beam([x + cx * 0.66 * scale, baseY + 0.05 * scale, z + cz * 0.66 * scale], [x + cx * 0.8 * scale, baseY + 0.02 * scale, z + cz * 0.8 * scale], 0.22 * scale, 0.1 * scale, col);
  }
  const prof = scaleProfile(DINH_PROFILE, scale);
  const cols = prof.map((_, i) => (i === 3 ? shade(col, 1.1) : i === 7 || i === 8 ? shade(col, 1.2) : i >= 8 ? shade(col, 0.45) : col));
  latheUp(S, x, baseY, z, prof, 12, col, { cap0: true, cap1: lid ? col : PROP_COL.mouth, cols, rot: angle });
  if (lid) {
    latheUp(S, x, baseY + 1.84 * scale, z, scaleProfile(DINH_LID_PROFILE, scale), 10, shade(col, 1.08), { cap0: false, cap1: false, rot: angle });
  }
  const topY = y + h, rimY = baseY + 1.85 * scale;
  for (const side of [-1, 1]) {
    const pA = frame.p3(-0.22 * scale, rimY, side * 0.66 * scale);
    const pB = frame.p3(0.22 * scale, rimY, side * 0.66 * scale);
    const qA = frame.p3(-0.22 * scale, topY, side * 0.7 * scale);
    const qB = frame.p3(0.22 * scale, topY, side * 0.7 * scale);
    const handleCol = shade(col, 1.12);
    S.beam(pA, qA, 0.1 * scale, 0.12 * scale, handleCol);
    S.beam(pB, qB, 0.1 * scale, 0.12 * scale, handleCol);
    S.beam([qA[0], qA[1] - 0.05 * scale, qA[2]], [qB[0], qB[1] - 0.05 * scale, qB[2]], 0.12 * scale, 0.12 * scale, handleCol);
  }
  endProp(S);
}

// Hạc đồng: a bronze crane standing on the back of a tortoise. About 150 triangles.
export function crane(S, x, y, z, angle, { h = 1.9, col = PROP_COL.bronze } = {}) {
  const scale = h / 1.9;
  const frame = localFrame(x, z, angle);
  const pt3 = (u, dy, v) => frame.p3(u * scale, y + dy * scale, v * scale);
  const lightCol = shade(col, 1.18);
  beginProp(S, y, KIND.PLAIN);

  lathe(S, [x, y, z], [0, 1, 0], scaleProfile(TORTOISE_PROFILE, scale), 8, col, { cap0: false, cap1: false, rot: angle });
  S.beam(pt3(0.45, 0.12, 0), pt3(0.78, 0.22, 0), 0.16 * scale, 0.14 * scale, col);
  for (const [lu, lv] of [[0.32, 0.42], [0.32, -0.42], [-0.32, 0.42], [-0.32, -0.42]]) {
    frame.box(S, lu * scale, lv * scale, y, y + 0.06 * scale, 0.28 * scale, 0.16 * scale, col);
  }
  for (const side of [-1, 1]) S.beam(pt3(0, 0.34, side * 0.09), pt3(-0.02, 0.92, side * 0.1), 0.05 * scale, 0.05 * scale, col);
  S.beam(pt3(-0.22, 1.02, 0), pt3(0.2, 1.06, 0), 0.34 * scale, 0.32 * scale, col);
  for (const side of [-1, 1]) S.beam(pt3(0.12, 1.1, side * 0.16), pt3(-0.32, 1.06, side * 0.18), 0.05 * scale, 0.24 * scale, lightCol);
  S.beam(pt3(-0.2, 1.04, 0), pt3(-0.4, 0.92, 0), 0.18 * scale, 0.12 * scale, col);
  S.beam(pt3(0.18, 1.12, 0), pt3(0.24, 1.55, 0), 0.1 * scale, 0.11 * scale, col);
  S.beam(pt3(0.24, 1.53, 0), pt3(0.2, 1.84, 0), 0.08 * scale, 0.09 * scale, col);
  S.beam(pt3(0.18, 1.86, 0), pt3(0.3, 1.86, 0), 0.1 * scale, 0.1 * scale, col);
  S.beam(pt3(0.3, 1.86, 0), pt3(0.5, 1.92, 0), 0.04 * scale, 0.04 * scale, lightCol);
  endProp(S);
}

// Thiết đình: small open metal kiosk that shelters a bronze beast in a temple court. About 90 triangles.
export function kiosk(S, x, y, z, angle, { w = 2.6, h = 3.2, col = PROP_COL.iron, slab = 0.25, slabCol = PROP_COL.stone } = {}) {
  const frame = localFrame(x, z, angle);
  const baseY = y + slab;
  const topY = baseY + h;
  const postOff = w / 2 - 0.1;
  const darkCol = shade(col, 0.8);
  beginProp(S, y);
  frame.box(S, 0, 0, y - 0.3, baseY, w + 0.3, w + 0.3, slabCol, { topKind: KIND.ROAD });
  S.kind = KIND.PLAIN;
  for (const su of [-1, 1]) for (const sv of [-1, 1]) frame.box(S, su * postOff, sv * postOff, baseY, topY, 0.12, 0.12, col);
  for (const side of [-1, 1]) {
    frame.box(S, 0, side * postOff, baseY + 0.55, baseY + 0.62, 2 * postOff, 0.06, col);
    frame.box(S, side * postOff, 0, baseY + 0.55, baseY + 0.62, 0.06, 2 * postOff, col);
  }
  frame.box(S, 0, 0, topY, topY + 0.16, w + 0.2, w + 0.2, darkCol);
  frame.box(S, 0, 0, topY + 0.16, topY + 0.3, w + 0.7, w + 0.7, col, { taper: 0.82 });
  frame.box(S, 0, 0, topY + 0.3, topY + 1.05, (w + 0.7) * 0.82, (w + 0.7) * 0.82, col, { taper: 0.12 });
  frame.box(S, 0, 0, topY + 1.0, topY + 1.25, 0.16, 0.16, shade(col, 1.3), { taper: 0.5 });
  endProp(S);
}

// Thần công: a long bronze cannon on its low wooden carriage, the muzzle toward angle. About 260 triangles.
export function cannon(S, x, y, z, angle, { len = 5.1, r = null, col = PROP_COL.bronze, wood = PROP_COL.wood, carriage = true } = {}) {
  const breechR = r ?? len * 0.068;
  const frame = localFrame(x, z, angle);
  const scale = len / 5.1;
  const axisY = carriage ? y + breechR + 0.3 * scale + 0.05 : y + breechR;
  beginProp(S, y, KIND.PLAIN);

  if (carriage) {
    const carriageLen = len * 0.62;
    for (const side of [-1, 1]) {
      frame.box(S, -0.05 * len, side * (breechR * 0.9), y + 0.16 * scale, axisY - breechR * 0.2, carriageLen, 0.14 * scale, wood, { taper: 1 });
    }
    frame.box(S, -0.05 * len, 0, y + 0.16 * scale, y + 0.28 * scale, carriageLen * 0.9, breechR * 1.8, shade(wood, 0.85));
    for (const wheelU of [-0.32, 0.22]) {
      const wheelR = 0.24 * scale;
      for (const side of [-1, 1]) {
        lathe(S, frame.p3(wheelU * len, y + wheelR, side * (breechR * 0.9 + 0.07 * scale)), frame.dir(0, 0, side), [[0, wheelR], [0.12 * scale, wheelR]], 8, shade(wood, 0.75), { rot: 0 });
      }
    }
  }
  const prof = CANNON_PROFILE.map(([along, radius]) => [along * len, radius * breechR]);
  const cols = prof.map((_, i) => (i === 4 || i === 5 || i === 9 || i === 10 ? shade(col, 1.2) : i >= 14 ? PROP_COL.mouth : col));
  lathe(S, frame.p3(-len * 0.5, axisY, 0), frame.dir(1, 0, 0), prof, 10, col, { cap0: false, cap1: PROP_COL.mouth, cols });
  S.beam(frame.p3(-len * 0.05, axisY, -breechR * 1.05), frame.p3(-len * 0.05, axisY, breechR * 1.05), breechR * 0.35, breechR * 0.35, col);
  endProp(S);
}

// ---------------------------------------------------------------- glazed jars and planters
// A glazed jar (chum): a round body, short neck, rolled lip. About 110 triangles.
export function jar(S, x, y, z, { h = 0.9, col = PROP_COL.glazeBrown, band = null } = {}) {
  beginProp(S, y, KIND.PLAIN);
  const prof = scaleProfile(JAR_PROFILE, h);
  latheUp(S, x, y, z, prof, 10, col, { cap0: false, cap1: PROP_COL.mouth, cols: band ? prof.map((_, i) => (i === 2 ? band : col)) : null });
  endProp(S);
}

// A planter for a clipped tree (bồn cảnh): on a stone stool (đôn), a glazed pot, and clipped tree tiers. About 130 triangles.
export function planter(S, x, y, z, angle, { r = 0.42, stand = 0.5, standCol = PROP_COL.stone, col = PROP_COL.glazeBlue, band = PROP_COL.glazeWhite, tree = true, square = false } = {}) {
  const frame = localFrame(x, z, angle);
  beginProp(S, y);
  let baseY = y;
  if (stand > 0) {
    if (square) {
      frame.box(S, 0, 0, y - 0.05, y + stand, r * 2, r * 2, standCol, { taper: 0.92 });
    } else {
      latheUp(S, x, y - 0.05, z, [[0, r * 0.82], [0.12, r * 0.9], [stand * 0.6 + 0.05, r * 0.78], [stand + 0.05, r * 0.9]], 8, standCol, { cap0: false, rot: angle });
    }
    baseY = y + stand;
  }
  S.kind = KIND.PLAIN;
  const pot = scaleProfile(POT_PROFILE, r);
  latheUp(S, x, baseY, z, pot, 10, col, { cap0: false, cap1: shade(PROP_COL.bark, 0.8), cols: pot.map((_, i) => (i === 2 || i === 3 ? band : col)), rot: angle });
  if (tree) {
    const trunkBase = baseY + 0.6 * r;
    const leanCos = Math.cos(angle + 0.8), leanSin = Math.sin(angle + 0.8);
    S.beam([x, trunkBase, z], [x + leanCos * r * 0.25, trunkBase + r * 1.2, z + leanSin * r * 0.25], r * 0.18, r * 0.18, PROP_COL.bark);
    for (const [y0, y1, tierScale] of PLANTER_TREE_TIERS) {
      latheUp(
        S, x + leanCos * r * 0.2, trunkBase + y0 * r, z + leanSin * r * 0.2,
        [[0, tierScale * r * 0.7], [(y1 - y0) * r * 0.35, tierScale * r], [(y1 - y0) * r, tierScale * r * 0.45]],
        7, y0 > 1.4 ? PROP_COL.leaf : PROP_COL.leafDark, { rot: angle },
      );
    }
  }
  endProp(S);
}
