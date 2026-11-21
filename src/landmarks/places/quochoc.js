import { KIND, hex, shade, inRing } from '../../geo/buf.js';
import { LAND_Y, PAL } from '../../config.js';
import { rise } from '../../geo/terrain.js';
import { glowPoints } from '../../geo/materials.js';
import { fence, roadsNear, leaves, FENCE } from '../enclosure.js';

// Trường Quốc Học (founded 1896; the campus rebuilt in brick, lime and tile from 1915) as it stands in 2026:
// the dark-red ("đỏ sẫm") two-storey blocks with their arched verandas and tiled hip roofs, the tam quan gate on
// Lê Lợi, the walled campus with its iron railing, the bình phong long mã inside the gate, the statue of
// Nguyễn Tất Thành on the circle in the yard, and the phượng trees. Sources and estimates: docs/places/quochoc.md.
//
// Frame: metres, x east, z south (scripts/build-data.mjs). Geometry from OpenStreetMap: campus way 695775622,
// the building ways listed in BLD, circle drive 835629406, service drive 828329033.

export const id = 'quochoc';

// campus wall, OSM way 695775622 (5.6 ha)
const RING = [[-501, 1197], [-495.8, 1199.4], [-486.9, 1195.2], [-383.6, 1100.1], [-383, 1087.1], [-571.6, 872.4],
  [-579.2, 870.7], [-639.6, 923.5], [-697.6, 974.1], [-696.9, 983.1], [-540, 1155.6]];
// the gate on the Lê Lợi frontage (hue.json quocHocGate) and the line of the campus axis through it
const GATE = { c: [-637.8, 921.9], a: 2.424 };
const CIRCLE = { c: [-569.9, 1001.2], r: 11.5 }; // OSM 835629406: the statue stands in its middle

// The buildings, as oriented rectangles: [osmId, colonial (1915 blocks), height to the ridge (survey, hue.json b[5]),
// centre x, centre z, angle (rad), parts [[u0, u1, v0, v1], ...] in the building's own frame, and optionally link:
// true for a short link block, butted at both ends of its length against other buildings, whose roof and cornice
// stop at those end walls instead of overhanging them].
// The two link blocks each join a 1915 wing to the old hall (OSM relation 9669095, drawn by city.js).
// Outlines of more than one rectangle (the front pavilions, the L- and T-shaped blocks) are split into parts.
const PAV = [[-5.2, 5.2, -6.3, 4.0], [-7.5, 7.5, -4.0, 1.85], [-2.3, 2.5, 4.0, 6.3]];
const BLD = [
  [118542427, 1, 13.0, -564.6, 904.8, -2.282, PAV],
  [695770486, 0, 12.5, -520.6, 942.5, 0.853, null],
  [695770487, 1, 13.0, -533.8, 967.1, 0.839, null],
  [695775623, 1, 4.6, -480.7, 1099.0, 2.415, null],
  [695775624, 0, 10.0, -524.0, 1131.8, 2.408, [[10.7, 24.4, -12, 12], [-24.4, 10.7, -8.6, 3.45]]],
  [695775625, 0, 4.6, -573.4, 1110.3, 0.831, null],
  [695775626, 0, 13.0, -559.8, 1102.8, 0.828, null],
  [695775628, 1, 13.0, -452.4, 1043.3, -2.301, [[-19.6, 15, -13.7, 13.7], [15, 19.6, -11.2, 10.3]]],
  [695775629, 0, 5.0, -529.1, 1044.3, 0.835, null, true],
  [695775630, 0, 5.0, -507.3, 1069.4, 3.980, null, true],
  [695775634, 1, 9.0, -494.8, 1082.0, 2.400, [[-17.9, 17.9, -11.6, 3.0], [-6.8, 6.4, 3.0, 11.6]]],
  [695775635, 0, 4.6, -674.9, 999.2, -2.319, null],
  [695775636, 1, 10.5, -665.6, 988.3, 0.833, PAV],
  [695775637, 1, 8.0, -637.4, 952.2, 2.419, null],
  [695775638, 1, 8.5, -608.1, 926.2, -0.719, null],
  [695775639, 1, 13.0, -537.3, 1033.7, -0.711, [[-8.3, 9.0, -9.6, 9.2], [-17.7, -8.3, -11, 11], [9.0, 17.7, -10.8, 10.3]]],
  [695775640, 1, 13.0, -602.9, 1029.2, -2.293, null],
  [695775641, 0, 12.5, -627.0, 1040.4, 0.833, null],
  [1377968893, 1, 5.5, -489.7, 1017.2, 0.836, null],
];
const DIMS = { 695770486: [62.6, 13.7], 695770487: [82.1, 15.5], 695775623: [44.6, 5.5], 695775625: [40.2, 9.3],
  695775626: [57.6, 14.0], 695775629: [8.6, 4.3], 695775630: [12.1, 4.0], 695775635: [36.2, 7.9], 695775637: [24.1, 14.7],
  695775638: [18.3, 15.1], 695775640: [81.5, 15.4], 695775641: [62.7, 14.1], 1377968893: [32.1, 6.6] };

// colours: the walls the school's own dark red, cream for cornices, string courses and balustrades
const RED = hex('#962a24'), RED_D = hex('#7e231e'), CREAM = hex('#eee0c0'), ROOF = hex('#8c4c3b'), RIDGE = hex('#d9c9a4');
const YELLOW = hex('#d8a52c'), IRON = hex('#24302b'), BRONZE = hex('#5b4a35'), BOARD = hex('#1f2f4a'), GOLD = hex('#d9b14a');

const gY = (x, z) => LAND_Y + rise(x, z);

export function build({ data, S, group }) {
  // a point in a building frame: c + u*a + v*b, with v = (-sin, cos) as Buf.box uses
  const at = (c, ang, u, v) => [c[0] + u * Math.cos(ang) - v * Math.sin(ang), c[1] + u * Math.sin(ang) + v * Math.cos(ang)];
  const lampPos = [], lampCol = [];
  const lampAt = (x, y, z, col = [1, 0.85, 0.58]) => { lampPos.push(x, y, z); lampCol.push(col[0], col[1], col[2]); };

  // ---- the blocks ----
  for (const [osm, colonial, top, cx, cz, ang, parts0, link = false] of BLD) {
    const dims = DIMS[osm];
    const parts = parts0 || [[-dims[0] / 2, dims[0] / 2, -dims[1] / 2, dims[1] / 2]];
    const c = [cx, cz];
    // the floor stands at the highest ground under the outline
    let floor = -Infinity;
    for (const [u0, u1, v0, v1] of parts) for (const [u, v] of [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]) { const p = at(c, ang, u, v); floor = Math.max(floor, rise(p[0], p[1])); }
    const y0 = LAND_Y + floor;
    S.base = floor;
    const wall = colonial ? RED : shade(RED, 1.04);
    for (const [u0, u1, v0, v1] of parts) {
      const w = u1 - u0, d = v1 - v0, pc = at(c, ang, (u0 + u1) / 2, (v0 + v1) / 2);
      const rh = Math.min(4.2, Math.max(1.6, Math.min(w, d) * 0.24));
      const eave = y0 + Math.max(2.8, top - rh - 0.3);
      const twoStorey = top >= 8;
      const storey = twoStorey ? (eave - y0 - 0.5) / 2 : eave - y0 - 0.5;
      // a gallery along the long side that faces the yard: the long wings of 1915 have arcades on both floors
      const long = w >= d;
      const gal = colonial && Math.max(w, d) >= 20 && Math.min(w, d) >= 9;
      const G = 2.6;
      let side = 0;
      if (gal) {
        const nrm = long ? [-Math.sin(ang), Math.cos(ang)] : [Math.cos(ang), Math.sin(ang)];
        side = (CIRCLE.c[0] - pc[0]) * nrm[0] + (CIRCLE.c[1] - pc[1]) * nrm[1] >= 0 ? 1 : -1;
      }
      // plinth
      S.kind = KIND.MASONRY;
      S.box(pc[0], pc[1], y0 - 0.6, y0 + 0.5, w + 0.2, d + 0.2, ang, shade(CREAM, 0.86), { topKind: KIND.ROAD });
      // walls (the shader draws the arched windows, trim and louvres of KIND.COLONIAL)
      S.kind = colonial ? KIND.COLONIAL : KIND.CIVIC;
      if (gal) {
        const q = long ? at(pc, ang, 0, -side * G / 2) : at(pc, ang, -side * G / 2, 0);
        S.box(q[0], q[1], y0 + 0.5, eave, long ? w : w - G, long ? d - G : d, ang, wall);
      } else {
        S.box(pc[0], pc[1], y0 + 0.5, eave, w, d, ang, wall);
      }
      S.kind = KIND.PLAIN;
      // cornice and (two storeys) string course
      S.box(pc[0], pc[1], eave - 0.45, eave, link ? w : w + 0.3, d + 0.3, ang, CREAM);
      if (twoStorey && !gal) S.box(pc[0], pc[1], y0 + 0.5 + storey - 0.1, y0 + 0.5 + storey + 0.15, w + 0.12, d + 0.12, ang, CREAM);
      if (gal) gallery(S, pc, ang, w, d, long, side, G, y0 + 0.5, storey, twoStorey ? 2 : 1, eave - 0.45, wall);
      // roof
      S.hip(pc[0], pc[1], link ? w - 1.8 : w, d, ang, eave, rh, ROOF, { over: 0.9, fascia: 0.22, fasciaCol: CREAM, ridgeCol: RIDGE });
    }
  }
  S.base = 0;

  // ---- the campus wall and railing; the gate opening ----
  const roads = roadsNear(data, [-540, 1035], 260);
  fence(S, RING, FENCE.quochoc, { roads, openings: [[GATE.c[0], GATE.c[1], 4.75]] });

  // ---- the gate ----
  gate(S, lampAt);

  // ---- the yard: the drive to the circle, the circle, the bình phong and the statue ----
  const inward = [Math.sin(GATE.a), -Math.cos(GATE.a)]; // into the campus: the gate frame's v points out to Lê Lợi
  const axisAt = (s, t = 0) => [GATE.c[0] + inward[0] * s - inward[1] * t, GATE.c[1] + inward[1] * s + inward[0] * t];
  const axLen = Math.hypot(CIRCLE.c[0] - GATE.c[0], CIRCLE.c[1] - GATE.c[1]);
  const axAng = Math.atan2(inward[1], inward[0]);
  S.kind = KIND.PLAIN;
  // the drive, in segments that follow the ground
  for (let s = 1.5; s < axLen - CIRCLE.r - 1; s += 6) {
    const s1 = Math.min(s + 6, axLen - CIRCLE.r - 1), m = axisAt((s + s1) / 2), y = gY(m[0], m[1]);
    S.box(m[0], m[1], y - 0.4, y + 0.05, s1 - s + 0.05, 6.5, axAng, hex('#bdb3a0'), { topKind: KIND.ROAD });
  }
  // the ring round the circle, and its lawn
  for (let k = 0; k < 24; k++) {
    const a0 = k / 24 * Math.PI * 2, a1 = (k + 1) / 24 * Math.PI * 2, am = (a0 + a1) / 2, rr = CIRCLE.r + 2.6;
    const m = [CIRCLE.c[0] + Math.cos(am) * rr, CIRCLE.c[1] + Math.sin(am) * rr], y = gY(m[0], m[1]);
    S.box(m[0], m[1], y - 0.4, y + 0.05, rr * (a1 - a0) + 0.6, 5.2, am + Math.PI / 2, hex('#bdb3a0'), { topKind: KIND.ROAD });
  }
  const cy = gY(CIRCLE.c[0], CIRCLE.c[1]);
  S.kind = KIND.MASONRY;
  S.cyl(CIRCLE.c[0], CIRCLE.c[1], cy - 0.3, cy + 0.25, CIRCLE.r, CIRCLE.r, 28, shade(CREAM, 0.8), { cap: false });
  S.kind = KIND.GROUND;
  S.cyl(CIRCLE.c[0], CIRCLE.c[1], cy - 0.3, cy + 0.2, CIRCLE.r - 0.25, CIRCLE.r - 0.25, 28, hex('#5f7f3c'));
  // the statue of Nguyễn Tất Thành as a pupil (1990, bronze), facing the gate on a stepped pedestal
  statue(S, CIRCLE.c, cy + 0.2, axAng + Math.PI);
  for (const t of [-1, 1]) { const q = axisAt(axLen - CIRCLE.r - 0.5, t * 3.6); lampAt(q[0], gY(q[0], q[1]) + 4.2, q[1]); }

  // the bình phong long mã with its stele, on the axis just inside the gate (position estimated)
  {
    const q = axisAt(11), y = gY(q[0], q[1]), a = GATE.a;
    S.kind = KIND.MASONRY;
    S.box(q[0], q[1], y - 0.3, y + 0.45, 5.6, 1.3, a, PAL.stone, { topKind: KIND.ROAD });
    S.box(q[0], q[1], y + 0.45, y + 2.7, 4.6, 0.6, a, RED_D);
    S.kind = KIND.PLAIN;
    for (const sg of [-1, 1]) {
      const p = at(q, a, sg * 2.45, 0);
      S.box(p[0], p[1], y + 0.45, y + 3.0, 0.5, 0.75, a, CREAM);
      S.cyl(p[0], p[1], y + 3.0, y + 3.45, 0.22, 0.06, 6, CREAM);
      const f = at(q, a, 0, sg * 0.31);
      S.box(f[0], f[1], y + 0.85, y + 2.3, 3.0, 0.04, a, hex('#4e7a63')); // the long mã in glazed shards
      S.box(f[0], f[1], y + 2.3, y + 2.42, 3.4, 0.05, a, CREAM);
    }
    S.box(q[0], q[1], y + 2.7, y + 2.85, 4.9, 0.8, a, CREAM);
    S.hip(q[0], q[1], 4.6, 0.6, a, y + 2.85, 0.45, YELLOW, { over: 0.2, glazed: true });
    const st = at(q, a, 0, -2.2); // the stele behind it, on the campus side
    S.kind = KIND.MASONRY;
    S.box(st[0], st[1], y - 0.2, y + 0.5, 1.6, 0.9, a, PAL.stone);
    S.box(st[0], st[1], y + 0.5, y + 2.2, 0.95, 0.25, a, hex('#59564f'));
    S.kind = KIND.PLAIN;
  }

  // ---- the trees the yard is known for: phượng (flamboyants) along the drive and round the circle ----
  const trees = [];
  for (let s = 22; s < axLen - CIRCLE.r - 6; s += 13) for (const t of [-1, 1]) trees.push(axisAt(s, t * 7.5));
  for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * Math.PI * 2; trees.push([CIRCLE.c[0] + Math.cos(a) * (CIRCLE.r + 8), CIRCLE.c[1] + Math.sin(a) * (CIRCLE.r + 8)]); }
  // between the long wings, inside the courtyards
  trees.push([-585, 1020], [-548, 1012], [-600, 990], [-520, 990], [-505, 1040], [-470, 1070], [-560, 1070], [-600, 1070], [-640, 1000]);
  if (Array.isArray(data.trees)) {
    let k = 0;
    for (const [x, z] of trees) {
      if (!inRing(x, z, RING)) continue;
      data.trees.push(Math.round(x * 10), Math.round(z * 10), 9 + (k++ % 4), 2); // scale 0.9-1.2, kind 2: flamboyant
    }
  }

  // ---- no generated houses inside the walls: the campus is buildings, yard and trees ----
  if (Array.isArray(data.infill)) {
    const a = data.infill, R = 8, keep = [];
    let near = data.meta?.counts?.infillNear ?? a.length / R, nearKept = 0;
    for (let i = 0; i < a.length / R; i++) {
      if (inRing(a[i * R] / 10, a[i * R + 1] / 10, RING)) continue;
      if (i < near) nearKept++;
      for (let j = 0; j < R; j++) keep.push(a[i * R + j]);
    }
    if (keep.length !== a.length) {
      a.length = 0;
      for (const v of keep) a.push(v);
      if (data.meta?.counts && data.meta.counts.infillNear != null) data.meta.counts.infillNear = nearKept;
    }
  }

  // ---- after dark: lamps on the gate, along the drive and round the circle ----
  for (let s = 18; s < axLen - CIRCLE.r - 4; s += 18) for (const t of [-1, 1]) { const q = axisAt(s, t * 4.2); lampAt(q[0], gY(q[0], q[1]) + 3.6, q[1]); }
  S.kind = KIND.PLAIN;
  for (let i = 0; i < lampPos.length; i += 3) {
    const x = lampPos[i], z = lampPos[i + 2], y = gY(x, z);
    if (lampPos[i + 1] - y > 3 && lampPos[i + 1] - y < 4.5) S.cyl(x, z, y, lampPos[i + 1] - 0.2, 0.07, 0.05, 5, IRON); // lamp posts in the yard
  }
  const pts = glowPoints(lampPos, lampCol, 4);
  pts.userData.glow = true;
  pts.userData.landmark = id;
  group.add(pts);
  S.kind = KIND.PLAIN;
  S.base = 0;
}

// The arcaded veranda of a 1915 block: square piers on the outer line, a slab and balustrade at the upper floor,
// segmental arches between the piers on each floor. Built inside the mapped outline, under the main roof.
function gallery(S, pc, ang, w, d, long, side, G, y0, storey, floors, ceil, wall) {
  const L = long ? w : d, D = long ? d : w;
  const a = long ? ang : ang + Math.PI / 2;
  const sg = long ? side : -side; // in the frame turned by 90°, the v axis is the old -u
  const P = (u, v) => [pc[0] + u * Math.cos(a) - v * Math.sin(a), pc[1] + u * Math.sin(a) + v * Math.cos(a)];
  const edge = sg * (D / 2 - 0.3), mid = sg * (D / 2 - G / 2);
  const bays = Math.max(3, Math.round((L - 0.6) / 3.4)), bay = (L - 0.6) / bays;
  S.kind = KIND.PLAIN;
  for (let k = 0; k <= bays; k++) {
    const p = P(-L / 2 + 0.3 + k * bay, edge);
    S.box(p[0], p[1], y0, ceil, 0.55, 0.55, a, wall);
    S.box(p[0], p[1], y0, y0 + 0.35, 0.7, 0.7, a, CREAM);
  }
  // the gallery's back wall is the main wall; its floor and ceiling slabs
  for (let f = 1; f < floors; f++) {
    const yf = y0 + storey * f, q = P(0, mid);
    S.box(q[0], q[1], yf - 0.3, yf, L, G, a, CREAM, { bottom: true });
    const e = P(0, sg * (D / 2 - 0.12));
    S.box(e[0], e[1], yf, yf + 0.9, L - 0.2, 0.16, a, CREAM); // balustrade
    S.box(e[0], e[1], yf + 0.9, yf + 1.0, L - 0.1, 0.26, a, shade(CREAM, 0.92));
  }
  // arches: the spandrel over each opening, a segmental arch drawn as a fan up to the ceiling of the floor
  const face = sg * (D / 2), N = 6;
  for (let f = 0; f < floors; f++) {
    const top = f + 1 < floors ? y0 + storey * (f + 1) - 0.3 : ceil;
    const spring = top - Math.min(1.25, storey * 0.32), rise = Math.min(0.75, bay * 0.22);
    for (let k = 0; k < bays; k++) {
      const u0 = -L / 2 + 0.3 + k * bay + 0.275, u1 = u0 + bay - 0.55;
      for (let j = 0; j < N; j++) {
        const t0 = j / N, t1 = (j + 1) / N;
        const ya = spring + rise * Math.sin(Math.PI * t0), yb = spring + rise * Math.sin(Math.PI * t1);
        const ua = u0 + (u1 - u0) * t0, ub = u0 + (u1 - u0) * t1;
        for (const off of [0, -sg * 0.35]) {
          const pa = P(ua, face + off), pb = P(ub, face + off);
          const nrm = off === 0 ? [-Math.sin(a) * sg, 0, Math.cos(a) * sg] : [Math.sin(a) * sg, 0, -Math.cos(a) * sg];
          S.quad([pa[0], ya, pa[1]], [pb[0], yb, pb[1]], [pb[0], top, pb[1]], [pa[0], top, pa[1]], wall, nrm);
        }
      }
      // the soffit under the arch, so it reads as thick
      const m = P((u0 + u1) / 2, face - sg * 0.175);
      S.box(m[0], m[1], spring - 0.05, spring + 0.02, u1 - u0, 0.35, a, shade(CREAM, 0.9));
    }
  }
}

// The tam quan gate on Lê Lợi, after Nguyễn Ngọc Tùng et al. (2021): 9.1 m wide, 2.2 m deep, 7.3 m tall; eight
// concrete columns 0.55 × 0.672 m; a middle opening of 4.3 m with two iron leaves and side doors of 1.2 m with one;
// 2.4 m from the ground to the upper floor and 1.5 m from it to the roof; an upper gallery (vọng lâu) with a
// balustrade, the name board and the bell; two tiers of imperial-yellow glazed tile with the ridge ornaments.
function gate(S, lampAt) {
  const c = GATE.c, a = GATE.a;
  const P = (u, v = 0) => [c[0] + u * Math.cos(a) - v * Math.sin(a), c[1] + u * Math.sin(a) + v * Math.cos(a)];
  const y = gY(c[0], c[1]);
  S.base = y - LAND_Y;
  const W = 9.1, D = 2.2;
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], y - 0.4, y + 0.15, W + 1.0, D + 1.4, a, PAL.stone, { topKind: KIND.ROAD });
  const y1 = y + 0.15, yF = y1 + 2.4;
  // the eight columns, four in each row
  const cols = [-4.175, -2.425, 2.425, 4.175];
  S.kind = KIND.PLAIN;
  for (const u of cols) for (const v of [-0.764, 0.764]) {
    const p = P(u, v);
    S.box(p[0], p[1], y1, yF, 0.55, 0.672, a, RED);
    S.box(p[0], p[1], y1, y1 + 0.45, 0.68, 0.8, a, CREAM);
  }
  // the upper floor: a slab with a cream edge over the columns, wider over the middle opening
  S.box(c[0], c[1], yF, yF + 0.3, W + 0.3, D + 0.3, a, CREAM, { bottom: true });
  // lintels over the side doors and the middle
  for (const v of [-0.764, 0.764]) {
    const p = P(0, v);
    S.box(p[0], p[1], yF - 0.35, yF, W, 0.5, a, RED_D);
  }
  // the gate leaves: two over the middle opening, one in each side door (iron, closed)
  leaves(S, P(-2.15), P(2.15), y1, 2.0, IRON);
  for (const sg of [-1, 1]) leaves(S, P(sg * 2.7), P(sg * 3.9), y1, 1.9, IRON);
  // the balustrade round the upper floor: red, with white chữ thọ panels
  const yB = yF + 0.3;
  for (const [u, v, len, ang] of [[0, D / 2 + 0.05, W + 0.2, a], [0, -D / 2 - 0.05, W + 0.2, a], [W / 2 + 0.05, 0, D + 0.2, a + Math.PI / 2], [-W / 2 - 0.05, 0, D + 0.2, a + Math.PI / 2]]) {
    const p = P(u, v);
    S.box(p[0], p[1], yB, yB + 0.75, len, 0.16, ang, RED);
    S.box(p[0], p[1], yB + 0.75, yB + 0.85, len + 0.1, 0.24, ang, CREAM);
    if (len > 5) for (let k = -3; k <= 3; k++) { const q = P(u + k * 1.15, v + Math.sign(v) * 0.09); S.box(q[0], q[1], yB + 0.2, yB + 0.6, 0.55, 0.02, a, CREAM); }
  }
  // the vọng lâu: columns of 1.5 m over the middle bay, carrying the two roof tiers
  const yR = yB + 1.5;
  for (const u of [-2.425, 2.425]) for (const v of [-0.764, 0.764]) {
    const p = P(u, v);
    S.box(p[0], p[1], yB, yR, 0.4, 0.45, a, RED);
  }
  // the name board QUỐC HỌC on both faces of the upper storey, and the bell inside
  for (const sg of [-1, 1]) {
    const q = P(0, sg * 0.82);
    S.box(q[0], q[1], yR - 0.85, yR - 0.05, 2.9, 0.06, a, GOLD);
    const q2 = P(0, sg * 0.86);
    S.box(q2[0], q2[1], yR - 0.8, yR - 0.1, 2.7, 0.04, a, BOARD);
  }
  S.box(c[0], c[1], yR - 0.15, yR, 5.4, 1.9, a, RED_D);
  S.cyl(c[0], c[1], yB + 0.35, yB + 1.2, 0.3, 0.38, 8, BRONZE);
  // the side bays: low hipped covers over the side doors at the floor
  for (const sg of [-1, 1]) {
    const q = P(sg * 3.4);
    S.hip(q[0], q[1], 2.0, D, a, yB + 0.85, 0.35, YELLOW, { over: 0.25, glazed: true });
  }
  // lower tier (eave over the vọng lâu) and upper tier with its ridge, to 7.3 m
  S.hip(c[0], c[1], 5.6, D, a, yR, 0.85, YELLOW, { over: 0.55, flare: 0.25, glazed: true, ridgeCol: YELLOW });
  S.kind = KIND.PLAIN;
  S.box(c[0], c[1], yR + 0.6, yR + 1.25, 4.0, 1.3, a, RED);
  S.hip(c[0], c[1], 4.0, 1.3, a, yR + 1.25, 0.95, YELLOW, { over: 0.5, flare: 0.3, glazed: true, ridgeCol: YELLOW });
  // the mặt nguyệt (sun disc) on the ridge and the dragon ends
  const yt = yR + 2.2;
  S.kind = KIND.PLAIN;
  S.cyl(c[0], c[1], yt - 0.05, yt + 0.12, 0.22, 0.22, 8, YELLOW);
  const disc = P(0);
  S.box(disc[0], disc[1], yt + 0.1, yt + 0.95, 0.65, 0.08, a, YELLOW, { taper: 0.6 });
  for (const sg of [-1, 1]) { const q = P(sg * 1.6); S.box(q[0], q[1], yt - 0.1, yt + 0.4, 0.5, 0.12, a, YELLOW, { taper: 0.5 }); }
  // lanterns at the columns of the front
  for (const u of [-4.175, 4.175]) { const p = P(u, -1.3); lampAt(p[0], yF + 0.1, p[1], [1, 0.84, 0.55]); }
  for (const sg of [-1, 1]) { const p = P(0, sg * 1.0); lampAt(p[0], yR - 0.3, p[1], [1, 0.9, 0.7]); }
  S.base = 0;
}

// The statue: a stepped stone pedestal, the figure in bronze (estimate: 3 m on a 2.6 m pedestal)
function statue(S, c, y, ang) {
  S.kind = KIND.MASONRY;
  S.box(c[0], c[1], y - 0.2, y + 0.45, 4.2, 4.2, ang, PAL.stone, { topKind: KIND.ROAD });
  S.box(c[0], c[1], y + 0.45, y + 0.9, 3.2, 3.2, ang, PAL.stone, { topKind: KIND.ROAD });
  S.box(c[0], c[1], y + 0.9, y + 2.9, 2.0, 2.0, ang, shade(PAL.stone, 0.9));
  S.box(c[0], c[1], y + 2.9, y + 3.15, 2.3, 2.3, ang, PAL.stone);
  S.kind = KIND.PLAIN;
  const y0 = y + 3.15;
  const P = (u, v) => [c[0] + u * Math.cos(ang) - v * Math.sin(ang), c[1] + u * Math.sin(ang) + v * Math.cos(ang)];
  for (const sg of [-1, 1]) { const l = P(sg * 0.17, 0); S.cyl(l[0], l[1], y0, y0 + 1.45, 0.14, 0.17, 6, BRONZE); }
  S.cyl(c[0], c[1], y0 + 1.35, y0 + 2.3, 0.3, 0.27, 8, BRONZE); // the tunic
  for (const sg of [-1, 1]) { const h = P(sg * 0.38, 0); S.cyl(h[0], h[1], y0 + 1.5, y0 + 2.25, 0.07, 0.09, 5, BRONZE); }
  S.cyl(c[0], c[1], y0 + 2.3, y0 + 2.42, 0.09, 0.09, 6, BRONZE);
  S.cyl(c[0], c[1], y0 + 2.42, y0 + 2.75, 0.14, 0.12, 8, BRONZE); // the head
  S.cyl(c[0], c[1], y0 + 2.75, y0 + 2.86, 0.12, 0.03, 8, BRONZE);
}
